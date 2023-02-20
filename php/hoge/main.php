<?php
$filename = './output.txt';
// ファイルを開く（'w'は書き込みモード）
$fp = fopen($filename, 'w');
// ファイルに書き込む
$data = "Hello World";
fputs($fp, $data);
// ファイルを閉じる
fclose($fp);
?>



