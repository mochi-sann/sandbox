import sys
from pathlib import Path
from io import BytesIO
import urllib.request
from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QFileDialog,
)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QPixmap
from PIL import Image
from PIL.ImageQt import ImageQt

class Worker(QThread):
    progress = Signal(int)
    done = Signal(str)

    def run(self):
        # 重い処理の例（UIスレッドをブロックしない）
        for i in range(1, 101):
            self.msleep(10)
            self.progress.emit(i)
        self.done.emit("完了！")

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PySide6 GUI Starter")
        self.resize(420, 240)

        self.label = QLabel("ようこそ！", alignment=Qt.AlignCenter)
        self.image = QLabel("画像プレビュー", alignment=Qt.AlignCenter)
        self.image.setMinimumSize(320, 180)
        self.image.setStyleSheet("QLabel { border: 1px solid #ccc; }")
        self.image.setScaledContents(True)

        self.btn_file = QPushButton("画像を開く")
        self.url_label = QLabel("画像URL:")
        self.url_edit = QLabel()
        # 使用時に QLineEdit を作って代入（型ヒント不要のため遅延インポート）
        from PySide6.QtWidgets import QLineEdit
        self.url_edit = QLineEdit()
        self.btn_url = QPushButton("URLを読み込む")
        self.btn_process = QPushButton("グレースケールに変換")
        self.btn_save = QPushButton("画像を保存")
        self.btn_run = QPushButton("重い処理を実行")
        self.status = QLabel("待機中", alignment=Qt.AlignCenter)

        layout = QVBoxLayout(self)
        url_row = QHBoxLayout()
        url_row.addWidget(self.url_label)
        url_row.addWidget(self.url_edit, 1)
        url_row.addWidget(self.btn_url)

        btns = QHBoxLayout()
        for b in (self.btn_file, self.btn_process, self.btn_save):
            btns.addWidget(b)

        layout.addWidget(self.label)
        layout.addWidget(self.image)
        layout.addLayout(url_row)
        layout.addLayout(btns)
        layout.addWidget(self.btn_run)
        layout.addWidget(self.status)

        self.btn_file.clicked.connect(self.choose_file)
        self.btn_process.clicked.connect(self.process_image)
        self.btn_save.clicked.connect(self.save_image)
        self.btn_url.clicked.connect(self.load_from_url)
        self.btn_run.clicked.connect(self.run_heavy)

        self.worker: Worker | None = None
        self.src_image: Image.Image | None = None
        self.proc_image: Image.Image | None = None

        self.dl_worker: DownloadWorker | None = None

    def choose_file(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "画像ファイルを選択",
            str(Path.home()),
            "Images (*.png *.jpg *.jpeg *.bmp *.gif *.webp)"
        )
        if not path:
            return
        try:
            self.src_image = Image.open(path).convert("RGBA")
            self.proc_image = None
            self.label.setText(f"選択: {Path(path).name}")
            self._show_image(self.src_image)
            self.status.setText("画像を読み込みました")
        except Exception as e:
            self.status.setText(f"読み込み失敗: {e}")

    def process_image(self):
        if not self.src_image:
            self.status.setText("先に画像を開いてください")
            return
        # シンプルな画像処理例: グレースケール変換
        try:
            self.proc_image = self.src_image.convert("L").convert("RGBA")
            self._show_image(self.proc_image)
            self.status.setText("グレースケールに変換しました")
        except Exception as e:
            self.status.setText(f"処理失敗: {e}")

    def save_image(self):
        img = self.proc_image or self.src_image
        if not img:
            self.status.setText("保存する画像がありません")
            return
        out_path, _ = QFileDialog.getSaveFileName(
            self,
            "保存先を選択",
            str(Path.home() / "output.png"),
            "Images (*.png *.jpg *.jpeg *.bmp *.webp)"
        )
        if not out_path:
            return
        try:
            # 拡張子に合わせて保存
            img.save(out_path)
            self.status.setText(f"保存しました: {out_path}")
        except Exception as e:
            self.status.setText(f"保存失敗: {e}")

    def _show_image(self, pil_image: Image.Image):
        qimage = ImageQt(pil_image)
        pix = QPixmap.fromImage(qimage)
        self.image.setPixmap(pix)

    def load_from_url(self):
        url = (self.url_edit.text() or "").strip()
        if not url:
            self.status.setText("URLを入力してください")
            return
        self.btn_url.setEnabled(False)
        self.status.setText("ダウンロード中…")
        self.dl_worker = DownloadWorker(url)
        self.dl_worker.done.connect(self._on_downloaded)
        self.dl_worker.error.connect(self._on_download_error)
        self.dl_worker.finished.connect(lambda: self.btn_url.setEnabled(True))
        self.dl_worker.start()

    def _on_downloaded(self, img: Image.Image):
        self.src_image = img
        self.proc_image = None
        self._show_image(img)
        self.label.setText("選択: (URLから読み込み)")
        self.status.setText("画像を読み込みました")

    def _on_download_error(self, msg: str):
        self.status.setText(f"ダウンロード失敗: {msg}")

    def run_heavy(self):
        self.btn_run.setEnabled(False)
        self.status.setText("処理中…")
        self.worker = Worker()
        self.worker.progress.connect(lambda i: self.status.setText(f"進捗 {i}%"))
        self.worker.done.connect(self.on_done)
        self.worker.start()

    def on_done(self, msg: str):
        self.status.setText(msg)
        self.btn_run.setEnabled(True)
        self.worker = None


class DownloadWorker(QThread):
    done = Signal(object)  # PIL Image
    error = Signal(str)

    def __init__(self, url: str):
        super().__init__()
        self.url = url

    def run(self):
        try:
            req = urllib.request.Request(self.url, headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"
            })
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            img = Image.open(BytesIO(data)).convert("RGBA")
            self.done.emit(img)
        except Exception as e:
            self.error.emit(str(e))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())
