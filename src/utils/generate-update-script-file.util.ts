import { fileExists } from "./file-exists.util.ts";
import { getCurrentExecutableDirPath } from "./get-current-executable-dir-path.util.ts";
import { getOs, OSType } from "./get-os.util.ts";

const WINDOWS_SCRIPT = `
@echo off
setlocal enabledelayedexpansion

:: Define file names
set "SCRIPT_DIR=%~dp0"
set "ORIGINAL=%SCRIPT_DIR%mcpb.exe"
set "UPDATE=%SCRIPT_DIR%update.exe"
set "BACKUP=%SCRIPT_DIR%mcpb.exe.backup"

echo === Update Script for mcpb.exe ===
echo.

:: 1. 1-second pause
echo [1/7] 1-second pause...
timeout /t 1 /nobreak >nul
echo OK

:: 2. Create backup of the original file if it exists (delete existing backup first)
echo [2/7] Creating backup...
if exist "%BACKUP%" (
    del /f /q "%BACKUP%" >nul 2>&1
)
if exist "%ORIGINAL%" (
    copy "%ORIGINAL%" "%BACKUP%" >nul
    echo Backup created: %BACKUP%
) else (
    echo The file %ORIGINAL% does not exist. It will be created from update.exe.
    set "BACKUP_EXISTS=false"
)
echo OK

:: 3. Delete the original file
echo [3/7] Deleting %ORIGINAL%...
if exist "%ORIGINAL%" (
    del /f /q "%ORIGINAL%" >nul 2>&1
    echo Deleted: %ORIGINAL%
) else (
    echo The file %ORIGINAL% no longer existed.
)
echo OK

:: 4. Rename update.exe to mcpb.exe
echo [4/7] Renaming %UPDATE% to %ORIGINAL%...
if not exist "%UPDATE%" (
    echo ERROR: File %UPDATE% not found
    pause
    exit /b 1
)
move "%UPDATE%" "%ORIGINAL%"
if errorlevel 1 (
    echo ERROR: Could not rename %UPDATE%
    pause
    exit /b 1
)
echo Rename successful
echo OK

:: 5. Run mcpb.exe with the --version argument
echo [5/7] Running %ORIGINAL% --version...
%ORIGINAL% --version

:: Capture the program's exit code
set "EXIT_CODE=%errorlevel%"
echo.

:: 6. Check if the execution was successful
echo [6/7] Checking result (Exit code: !EXIT_CODE!)...
if !EXIT_CODE! equ 0 (
    echo The execution was SUCCESSFUL.
    
    :: 6. If successful, delete the backup
    echo [7/7] Deleting backup due to success...
    if exist "%BACKUP%" (
        del /f /q "%BACKUP%" >nul 2>&1
        echo Backup deleted.
    ) else (
        echo No backup to delete.
    )
    echo.
    echo === Process completed SUCCESSFULLY ===
) else (
    :: 7. If failed, restore from backup
    echo The execution FAILED (Code: !EXIT_CODE!).
    echo [7/7] Restoring from backup...
    
    :: Delete the new file
    if exist "%ORIGINAL%" (
        del /f /q "%ORIGINAL%" >nul 2>&1
        echo Deleted corrupted %ORIGINAL%.
    )
    
    :: Restore backup
    if exist "%BACKUP%" (
        rename "%BACKUP%" "%ORIGINAL%" >nul
        if errorlevel 1 (
            echo ERROR: Could not restore backup.
        ) else (
            echo Backup successfully restored to %ORIGINAL%.
        )
    ) else (
        echo WARNING: No backup found to restore.
    )
    echo.
    echo === Process completed with ERRORS ===
)

echo.
pause
`.trim();

const LINUX_SCRIPT = `
#!/bin/bash

# Habilitar detección de errores
set -e

# Definir nombres de archivos
ORIGINAL="mcpb"
UPDATE="update"
BACKUP="mcpb.backup"

echo "=== Update Script for mcpb ==="
echo ""

# 1. Pausa de 1 segundo
echo "[1/7] 1-second pause..."
sleep 1
echo "OK"

# 2. Crear backup del archivo original si existe (eliminar backup existente primero)
echo "[2/7] Creating backup..."
if [ -f "$BACKUP" ]; then
    rm -f "$BACKUP"
fi

if [ -f "$ORIGINAL" ]; then
    cp "$ORIGINAL" "$BACKUP"
    echo "Backup created: $BACKUP"
else
    echo "The file $ORIGINAL does not exist. It will be created from $UPDATE."
    BACKUP_EXISTS=false
fi
echo "OK"

# 3. Eliminar el archivo original
echo "[3/7] Deleting $ORIGINAL..."
if [ -f "$ORIGINAL" ]; then
    rm -f "$ORIGINAL"
    echo "Deleted: $ORIGINAL"
else
    echo "The file $ORIGINAL no longer existed."
fi
echo "OK"

# 4. Renombrar update a mcpb
echo "[4/7] Renaming $UPDATE to $ORIGINAL..."
if [ ! -f "$UPDATE" ]; then
    echo "ERROR: File $UPDATE not found"
    read -p "Press any key to continue..."
    exit 1
fi

if ! mv "$UPDATE" "$ORIGINAL" 2>/dev/null; then
    echo "ERROR: Could not rename $UPDATE"
    read -p "Press any key to continue..."
    exit 1
fi
echo "Rename successful"
echo "OK"

# 5. Ejecutar mcpb con argumento --version
echo "[5/7] Running $ORIGINAL --version..."
if [ ! -x "$ORIGINAL" ]; then
    chmod +x "$ORIGINAL"
fi

./"$ORIGINAL" --version
EXIT_CODE=$?
echo ""

# 6. Verificar si la ejecución fue exitosa
echo "[6/7] Checking result (Exit code: $EXIT_CODE)..."
if [ $EXIT_CODE -eq 0 ]; then
    echo "The execution was SUCCESSFUL."
    
    # 6. Si es exitoso, eliminar backup
    echo "[7/7] Deleting backup due to success..."
    if [ -f "$BACKUP" ]; then
        rm -f "$BACKUP"
        echo "Backup deleted."
    else
        echo "No backup to delete."
    fi
    echo ""
    echo "=== Process completed SUCCESSFULLY ==="
else
    # 7. Si falló, restaurar backup
    echo "The execution FAILED (Code: $EXIT_CODE)."
    echo "[7/7] Restoring from backup..."
    
    # Eliminar el nuevo archivo
    if [ -f "$ORIGINAL" ]; then
        rm -f "$ORIGINAL"
        echo "Deleted corrupted $ORIGINAL."
    fi
    
    # Restaurar backup
    if [ -f "$BACKUP" ]; then
        if ! mv "$BACKUP" "$ORIGINAL" 2>/dev/null; then
            echo "ERROR: Could not restore backup."
        else
            echo "Backup successfully restored to $ORIGINAL."
            chmod +x "$ORIGINAL" 2>/dev/null || true
        fi
    else
        echo "WARNING: No backup found to restore."
    fi
    echo ""
    echo "=== Process completed with ERRORS ==="
fi

echo ""
read -p "Press any key to continue..."
`.trim();

export function getScriptData() {
  const [os, arch] = getOs();
  const executableDir = getCurrentExecutableDirPath();
  const _path = `${executableDir}/update`;

  if (os === OSType.WINDOWS) {
    return { script: WINDOWS_SCRIPT, path: `${_path}.bat` };
  } else if (os === OSType.LINUX) {
    return { script: LINUX_SCRIPT, path: `${_path}.sh` };
  } else if (os === OSType.MACOS) {
    return { script: LINUX_SCRIPT, path: `${_path}.sh` };
  }

  throw new Error(`Unsupported OS: ${Deno.build.os}.`);
}

export function clearUpdateScriptFile() {
  const { path } = getScriptData();

  if (fileExists(path)) {
    try {
      Deno.removeSync(path);
    } catch {}
  }
}

export function generateUpdateScriptFile() {
  const { script, path } = getScriptData();

  Deno.writeTextFileSync(path, script);

  return path;
}
