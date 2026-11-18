@echo off
set "SCRIPT_DIR=%~dp0"
"%SCRIPT_DIR%..\backend_tools\apache-maven-3.9.9\bin\mvn.cmd" %*
