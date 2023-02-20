# 第1問

```php
// show.php
<?php
echo $_POST["myname"];
?>
```

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

# 第3問

```php
<?php
$filename = './input.txt';
// ファイルを開く（'w'は書き込みモード）
$fp =  file_get_contents(  $filename);
echo $fp;

?>
```

# 第4問

`multipart/form-data`と記述する

```php
<form action="upload.php" method="POST" enctype="multipart/form-data">
  <input type="file" name="attachment" />
  <button type="submit">送信</button>
</form>
```

# 第5問

```php
<?php
  $body = '<script>alert("XSS");</script>';
  echo htmlentities( $body );
?>
```
