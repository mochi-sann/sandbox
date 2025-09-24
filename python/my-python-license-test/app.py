import sys
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QLabel, QFileDialog
from PySide6.QtCore import Qt, QThread, Signal

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
        self.btn_file = QPushButton("ファイルを選ぶ")
        self.btn_run = QPushButton("重い処理を実行")
        self.status = QLabel("待機中", alignment=Qt.AlignCenter)

        layout = QVBoxLayout(self)
        for w in (self.label, self.btn_file, self.btn_run, self.status):
            layout.addWidget(w)

        self.btn_file.clicked.connect(self.choose_file)
        self.btn_run.clicked.connect(self.run_heavy)

        self.worker: Worker | None = None

    def choose_file(self):
        path, _ = QFileDialog.getOpenFileName(self, "ファイルを選択")
        if path:
            self.label.setText(f"選択: {path}")

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

if __name__ == "__main__":
    app = QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())

