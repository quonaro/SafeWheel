Unicode true

####
## Custom NSIS installer for SafeWheel.
## Wails uses this file instead of the default template when it exists at
## build/windows/installer/project.nsi. The wails_tools.nsh include provides
## all standard macros (wails.files, wails.writeUninstaller, etc.).
####

# Per-user install into $LOCALAPPDATA\Programs: no admin rights/UAC required.
# wails_tools.nsh defaults REQUEST_EXECUTION_LEVEL and WAILS_INSTALL_SCOPE to
# admin/machine, so define them here (before the include) to force a per-user
# installer even when `wails build -nsis` is run without -installscope user.
# An explicit `-installscope machine` on the command line still wins
# (command-line defines are processed before this script).
!ifndef REQUEST_EXECUTION_LEVEL
    !define REQUEST_EXECUTION_LEVEL "user"
!endif
!ifndef WAILS_INSTALL_SCOPE
    !define WAILS_INSTALL_SCOPE "user"
!endif

!include "wails_tools.nsh"

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support.
ManifestDPIAware true

!include "MUI2.nsh"
!include "WinMessages.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
!define DISPLAY_NAME "ЮИД Безопасное колесо"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TITLE "Вас приветствует мастер установки ${DISPLAY_NAME} ${INFO_PRODUCTVERSION}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Russian"

Name "${DISPLAY_NAME}"
Caption "Установка ${DISPLAY_NAME} ${INFO_PRODUCTVERSION}"
BrandingText " "
OutFile "..\..\bin\safe-wheel-windows-amd64-installer.exe"
InstallDir "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
ShowInstDetails show

Function .onInit
   !insertmacro wails.setShellContext
   !insertmacro wails.checkArchitecture
FunctionEnd

Section
    !insertmacro wails.webview2runtime

    SetOutPath $INSTDIR

    !insertmacro wails.files

    # 1. Desktop shortcut
    CreateShortCut "$DESKTOP\${DISPLAY_NAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"

    # 2. Start Menu shortcut
    CreateShortcut "$SMPROGRAMS\${DISPLAY_NAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"

    !insertmacro wails.writeUninstaller
SectionEnd

Function un.onInit
   SetShellVarContext current
FunctionEnd

Section "uninstall"
    # Remove shortcuts
    Delete "$DESKTOP\${DISPLAY_NAME}.lnk"
    Delete "$SMPROGRAMS\${DISPLAY_NAME}.lnk"

    # Remove WebView2 data
    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}"

    # Remove only the executable and uninstaller; preserve safewheel.db
    Delete "$INSTDIR\${PRODUCT_EXECUTABLE}"
    Delete "$INSTDIR\uninstall.exe"

    !insertmacro wails.deleteUninstaller
SectionEnd
