from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}

class Item():
    name: str
    price: float
    is_offer: Optional[bool] = None
@app.post("/items/")
asnyc def create_item(item: Item):
    return item
