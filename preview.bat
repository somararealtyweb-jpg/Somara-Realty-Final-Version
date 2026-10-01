@echo off
title Somara Realty - Local Preview
echo.
echo Starting local preview server...
echo.
echo Once it says "Accepting connections", open this in your browser:
echo    http://localhost:3000
echo.
echo Press CTRL+C in this window to stop the server when you're done testing.
echo.
npx --yes serve -l 3000 .
pause
