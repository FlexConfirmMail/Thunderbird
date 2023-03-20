
if not exist build_msi_configs.bat (
  exit /b 1
)
call build_msi_configs.bat

set MSITEMP=%USERPROFILE%\temp%RANDOM%
set SOURCE=%~dp0
xcopy "%SOURCE%*" "%MSITEMP%" /S /I
copy %NMH_NAME%.windows.json "%MSITEMP%\%NMH_NAME%.json"
cd /d "%MSITEMP%"
copy 386\host.exe "%cd%\"
go-msi.exe make --msi %MSI_BASENAME%-386.msi --version %ADDON_VERSION% --src templates --out "%cd%\outdir" --arch 386
del host.exe
copy amd64\host.exe "%cd%\"
go-msi.exe make --msi %MSI_BASENAME%-amd64.msi --version %ADDON_VERSION% --src templates --out "%cd%\outdir" --arch amd64
xcopy *.msi "%SOURCE%" /I /Y
cd /d "%SOURCE%"
rd /S /Q "%MSITEMP%"
