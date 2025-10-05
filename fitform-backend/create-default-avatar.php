<?php
// Create a simple default avatar
$width = 100;
$height = 100;

// Create image
$image = imagecreate($width, $height);

// Define colors
$background = imagecolorallocate($image, 200, 200, 200); // Light gray background
$text_color = imagecolorallocate($image, 100, 100, 100); // Dark gray text

// Fill background
imagefill($image, 0, 0, $background);

// Add text
$text = "User";
$font_size = 3;
$x = ($width - strlen($text) * imagefontwidth($font_size)) / 2;
$y = ($height - imagefontheight($font_size)) / 2;

imagestring($image, $font_size, $x, $y, $text, $text_color);

// Save image
imagepng($image, 'storage/app/public/profiles/default-avatar.png');

// Clean up
imagedestroy($image);

echo "Default avatar created successfully!\n";
?>
