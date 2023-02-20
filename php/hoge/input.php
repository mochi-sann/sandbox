<?php
$filename = './input.txt';
// ファイルを開く（'w'は書き込みモード）
$fp =  file_get_contents(  $filename);
echo $fp;

?>

