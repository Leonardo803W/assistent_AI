Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

Cartella = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run Chr(34) & Cartella & "\avvia_MyAI.bat" & Chr(34), 0, False

Set FSO = Nothing
Set WshShell = Nothing
