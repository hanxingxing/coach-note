# Generate PWA icons (pure PowerShell + System.Drawing, no third-party deps)
# Output: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
# Note: the "ke" (ke1) glyph is built via [char]0x8BFE to keep this file pure ASCII.

Add-Type -AssemblyName System.Drawing

function New-AppIcon {
    param(
        [int]$Size,
        [string]$OutPath,
        [bool]$Maskable
    )

    $bmp = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded-rect background (maskable icons keep a safe margin)
    $m = 0.0
    if ($Maskable) { $m = [float]($Size * 0.12) }
    $rect = [System.Drawing.RectangleF]::new([float]$m, [float]$m, [float]($Size - 2 * $m), [float]($Size - 2 * $m))
    $radius = [float]($Size * 0.22)
    $d = $radius * 2
    $gp = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $gp.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $gp.AddArc(($rect.Right - $d), $rect.Y, $d, $d, 270, 90)
    $gp.AddArc(($rect.Right - $d), ($rect.Bottom - $d), $d, $d, 0, 90)
    $gp.AddArc($rect.X, ($rect.Bottom - $d), $d, $d, 90, 90)
    $gp.CloseFigure()

    # Gradient fill
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 96, 165, 250),
        [System.Drawing.Color]::FromArgb(255, 37, 99, 235),
        45.0
    )
    $g.FillPath($brush, $gp)

    # Centered "ke" glyph
    $glyph = [string][char]0x8BFE
    $fontSize = [float]($Size * 0.55)
    $font = [System.Drawing.Font]::new('Microsoft YaHei', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $textRect = [System.Drawing.RectangleF]::new(0, 0, $Size, $Size)
    $g.DrawString($glyph, $font, $textBrush, $textRect, $sf)

    # Save
    $dir = Split-Path $OutPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $font.Dispose()
    $sf.Dispose()
    $textBrush.Dispose()
    $brush.Dispose()
    $gp.Dispose()
    Write-Host "generated: $OutPath ($Size x $Size)"
}

New-AppIcon 192 'public/icons/icon-192.png' $false
New-AppIcon 512 'public/icons/icon-512.png' $false
New-AppIcon 512 'public/icons/icon-maskable-512.png' $true
New-AppIcon 180 'public/icons/apple-touch-icon.png' $false
