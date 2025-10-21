<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Settings
    |--------------------------------------------------------------------------
    |
    | Set some default values. It is possible to add all defines that can be set
    | in dompdf_config.inc.php. You can also override the entire config file.
    |
    */
    'show_warnings' => false,   // Throw an Exception on warnings from dompdf
    'public_path' => public_path(), // Override the public path if needed
    'convert_entities' => true, // Convert html entities to UTF-8
    'options' => [
        /**
         * The location of the DOMPDF font directory
         *
         * The location of the directory where DOMPDF will store fonts and font metrics
         * Note: This directory must exist and be writable by the webserver process.
         * *Please note the trailing slash.*
         *
         * Notes regarding fonts:
         * Additional .afm font metrics can be added by concatenating to the
         * metric files; the additional font metrics will be ignored if they
         * are not in the correct format.
         *
         * Only the original "Base 14 fonts" are present on all pdf viewers.
         * Additional fonts must be embedded in the pdf file or the PDF
         * may not display correctly. This can significantly increase
         * file size unless font subsetting is enabled.
         *
         * Any font specification in the source HTML is translated to the closest font available
         * in the font directory.
         *
         * The pdf standard "Base 14 fonts" are:
         * Courier, Courier-Bold, Courier-Oblique, Courier-BoldOblique,
         * Helvetica, Helvetica-Bold, Helvetica-Oblique, Helvetica-BoldOblique,
         * Times-Roman, Times-Bold, Times-Italic, Times-BoldItalic,
         * Symbol, ZapfDingbats.
         */
        "font_dir" => storage_path('fonts/'), // advised by dompdf

        /**
         * The location of the DOMPDF font cache directory
         *
         * This directory contains the cached font metrics for the fonts used by DOMPDF.
         * This directory can be the same as DOMPDF_FONT_DIR
         *
         * Note: This directory must exist and be writable by the webserver process.
         */
        "font_cache" => storage_path('fonts/'),

        /**
         * The location of a temporary directory.
         *
         * The directory specified must be writeable by the webserver process.
         * The temporary directory is required to download remote images and when
         * using the PFDLib back end.
         */
        "temp_dir" => sys_get_temp_dir(),

        /**
         * ==== IMPORTANT ====
         * dompdf's "chroot": Prevents dompdf from accessing system files or other
         * files on the webserver.  All local files opened by dompdf must be in a
         * subdirectory of this directory.  DO NOT set it to '/' since this could
         * allow an attacker to access any file on the server.  This should be an
         * absolute path.
         * This is only checked on command line call by dompdf.php, but not by
         * direct class use.
         */
        "chroot" => realpath(base_path()),

        /**
         * Whether to enable font subsetting or not.
         */
        "enable_font_subsetting" => true,

        /**
         * The PDF rendering backend to use
         *
         * Valid settings are 'PDFLib', 'CPDF' (the bundled R&OS PDF class), 'GD' and
         * 'auto'. 'auto' will look for PDFLib and use it if found, or if not it
         * will fall back on the bundled R&OS CPDF class. 'GD' renders PDFs to graphic
         * files. {@link Dompdf\Adapter\CPDF} is slightly slower than {@link Dompdf\Adapter\PDFLib}, but
         * handles more complex cases. On the other hand, {@link Dompdf\Adapter\PDFLib} is
         * not officially maintained anymore and has not had any updates in a couple
         * of years. This feature is experimental, so use it at your own risk.
         */
        "default_media_type" => "screen",

        /**
         * The default paper size.
         */
        "default_paper_size" => "a4",

        /**
         * The default paper orientation.
         */
        "default_paper_orientation" => "portrait",

        /**
         * The default font family
         *
         * Used if no suitable fonts can be found. This must exist in the font folder.
         * @var string
         */
        "default_font" => "DejaVu Sans",

        /**
         * Image DPI setting
         *
         * This setting determines the default DPI setting for images and fonts.  The
         * DPI may be overridden for inline images by explictly setting the
         * image's width and height style attributes (i.e. if the image's native
         * width is 600 pixels and you specify the image's width as 72 points,
         * the image will have a DPI of 600 in the final PDF).
         *
         * @var int
         */
        "dpi" => 96,

        /**
         * Enable inline PHP
         *
         * If this setting is set to true then DOMPDF will automatically evaluate
         * inline PHP contained within <script type="text/php"> ... </script> tags.
         *
         * Enabling this for documents you do not trust (e.g. arbitrary remote html
         * pages) is a security risk.  Set this option to false if you wish to process
         * untrusted documents.
         *
         * @var bool
         */
        "enable_php" => true,

        /**
         * Enable inline Javascript
         *
         * If this setting is set to true then DOMPDF will automatically insert
         * JavaScript code contained within <script type="text/javascript"> ... </script> tags.
         *
         * @var bool
         */
        "enable_javascript" => false,

        /**
         * Enable remote file access
         *
         * If this setting is set to true, DOMPDF will access remote sites for
         * images and CSS files as required.
         * This is required for part of test case www/test/image_variants.html through www/examples.php
         *
         * @var bool
         */
        "enable_remote" => false,

        /**
         * A ratio applied to the fonts height to be more like browsers' line height
         */
        "font_height_ratio" => 1.1,

        /**
         * Use the HTML5 Lib parser
         *
         * @deprecated This parser is now always used
         * @var bool
         */
        "enable_html5_parser" => true,
    ],
];
