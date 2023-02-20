# 第一問



# 第2問

```php
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

```



# 第三問
```php 
<?php
$filename = './input.txt';
// ファイルを開く（'w'は書き込みモード）
$fp =  file_get_contents(  $filename);
echo $fp;

?>
```
