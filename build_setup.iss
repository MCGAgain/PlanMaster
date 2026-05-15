[Setup]
AppName=PlanMaster
AppVersion=1.3.10
DefaultDirName={autopf}\PlanMaster
DefaultGroupName=PlanMaster
OutputBaseFilename=PlanMaster-Setup
OutputDir=dist
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\PlanMaster.exe

[Files]
Source: "dist\PlanMaster\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\PlanMaster"; Filename: "{app}\PlanMaster.exe"
Name: "{group}\卸载 PlanMaster"; Filename: "{uninstallexe}"
Name: "{autodesktop}\PlanMaster"; Filename: "{app}\PlanMaster.exe"

[Run]
Filename: "{app}\PlanMaster.exe"; Description: "启动 PlanMaster"; Flags: nowait postinstall skipifsilent
