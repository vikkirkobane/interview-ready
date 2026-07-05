Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("assets/icon.png")
$bitmap = New-Object System.Drawing.Bitmap 1024, 1024
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$targetRect = New-Object System.Drawing.Rectangle 212, 212, 600, 600
$graphics.DrawImage($img, $targetRect)
$bitmap.Save("assets/icon_padded.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
$img.Dispose()
