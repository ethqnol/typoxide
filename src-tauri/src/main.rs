#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::fs;
use std::process::Command;
use std::path::Path;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use glob::glob;

#[tauri::command]
fn compile_preview(source: &str, project_root: &str) -> Result<String, String> {
    let temp_dir = Path::new(project_root);
    let basename = Uuid::new_v4().to_string();
    let temp_file_name = format!(".{}.typ", basename);
    let temp_file_path = temp_dir.join(&temp_file_name);

    // Use a template for the output path
    let output_template = temp_dir.join(format!(".{}-{{p}}.svg", basename));

    fs::write(&temp_file_path, source).map_err(|e| e.to_string())?;

    let output = Command::new("typst")
        .args([
            "compile",
            temp_file_path.to_str().unwrap(),
            output_template.to_str().unwrap(),
        ])
        .current_dir(project_root)
        .output()
        .map_err(|e| e.to_string())?;

    // Always clean up the temp typ file
    let _ = fs::remove_file(&temp_file_path);

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    // Collect all generated SVG pages
    let glob_pattern = temp_dir.join(format!(".{}-*.svg", basename));
    let mut pages = Vec::new();
    
    for entry in glob(glob_pattern.to_str().unwrap()).expect("Failed to read glob pattern") {
        if let Ok(path) = entry {
            if let Ok(content) = fs::read_to_string(&path) {
                pages.push(content);
            }
            let _ = fs::remove_file(path);
        }
    }

    if pages.is_empty() {
        return Err("No pages generated".to_string());
    }

    // Combine all pages into a single HTML document
    let combined_html = format!(
        "<div style='display: flex; flex-direction: column; gap: 20px;'>{}</div>",
        pages.into_iter()
            .enumerate()
            .map(|(_, svg)| format!("<div style='border: 1px solid #ccc; background: white;'>{}</div>", svg))
            .collect::<Vec<_>>()
            .join("")
    );

    Ok(combined_html)
}

#[tauri::command]
fn export_pdf(source: &str, project_root: &str, destination: &str) -> Result<(), String> {
    let temp_dir = Path::new(project_root);
    let temp_file_name = format!(".{}.typ", Uuid::new_v4()); // Use a hidden file
    let temp_file_path = temp_dir.join(&temp_file_name);
    let output_pdf_path = temp_file_path.with_extension("pdf");

    fs::write(&temp_file_path, source).map_err(|e| e.to_string())?;

    let output = Command::new("typst")
        .args([
            "compile",
            temp_file_path.to_str().unwrap(),
            output_pdf_path.to_str().unwrap(),
        ])
        .current_dir(project_root)
        .output()
        .map_err(|e| e.to_string())?;

    // Always clean up the temp file
    let _ = fs::remove_file(&temp_file_path);

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    fs::rename(&output_pdf_path, destination).map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
    children: Vec<FileEntry>,
}

fn read_directory_recursive(path: &Path) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }

        let is_directory = path.is_dir();
        let children = if is_directory {
            read_directory_recursive(&path)?
        } else {
            Vec::new()
        };

        entries.push(FileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory,
            children,
        });
    }
    // Sort entries to have directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        if a.is_directory && !b.is_directory {
            std::cmp::Ordering::Less
        } else if !a.is_directory && b.is_directory {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });
    Ok(entries)
}

#[tauri::command]
fn get_file_tree(project_root: &str) -> Result<Vec<FileEntry>, String> {
    read_directory_recursive(Path::new(project_root))
}

#[tauri::command]
fn get_home_directory() -> Result<String, String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Could not determine home directory".to_string())
}

fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![compile_preview, export_pdf, get_file_tree, get_home_directory])
    .run(context)
    .expect("error while running tauri application");
}