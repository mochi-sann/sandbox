---
pdf_options:
  format: A4
  margin: 20mm 20mm
stylesheet: https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.10.0/github-markdown.min.css
body_class: markdown-body
---


## 第1問

```php
// show.php
<?php
echo $_POST["myname"];
?>
```

## 第2問

```php
<?php
$filename = './output.txt';

$fp = fopen($filename, 'w');
$data = "Hello World";

fputs($fp, $data);
fclose($fp);
?>
```

## 第3問

```php
<?php
$filename = './input.txt';

$fp =  file_get_contents(  $filename);
echo $fp;

?>
```

## 第4問

enctype 属性に`multipart/form-data`と記述する

```html
<form action="upload.php" method="POST" enctype="multipart/form-data">
  <input type="file" name="attachment" />
  <button type="submit">送信</button>
</form>
```

## 第5問

```php
<?php
  $body = '<script>alert("XSS");</script>';
  echo htmlentities( $body );
?>
```
