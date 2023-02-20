<?php
$body = '<script>alert("XSS");</script>';
 echo htmlentities( $body );
?>
