from reactpy import component, html, run

from reactpy import component, html, run


@component
def DataList(items, filter_by_priority=None, sort_by_priority=False):
    if filter_by_priority is not None:
        items = [i for i in items if i["priority"] <= filter_by_priority]
    if sort_by_priority:
        items = sorted(items, key=lambda i: i["priority"])
    list_item_elements = [html.li({"key": i["id"]}, i["text"]) for i in items]
    return html.ul(list_item_elements)

@component
def PrintButton(display_text, message_text):
    def handle_event(event):
        print(message_text)

    return html.button({"on_click": handle_event}, display_text)
from reactpy import component, html, run, use_state


@component
def ColorButton():
    color, set_color = use_state("gray")

    def handle_click(event):
        set_color("orange")
        set_color("pink")
        set_color("blue")

    def handle_reset(event):
        set_color("gray")

    return html.div(
        html.button(
            {"on_click": handle_click, "style": {"background_color": color}},
            "Set Color",
        ),
        html.button(
            {"on_click": handle_reset, "style": {"background_color": color}}, "Reset"
        ),
    )


@component
def Counter():
    counter , set_counter = use_state(0)


    def handle_click(event):
        print(f"click {counter} ")
        set_counter(counter + 1)

    return html.div(
            html.p(f"Counter: {counter}"),
            html.button({"on_click" : handle_click} , "count up")
            )


@component
def TodoList():
    tasks = [
        {"id": 0, "text": "Make breakfast", "priority": 0},
        {"id": 1, "text": "Feed the dog", "priority": 0},
        {"id": 2, "text": "Do laundry", "priority": 2},
        {"id": 3, "text": "Go on a run", "priority": 1},
        {"id": 4, "text": "Clean the house", "priority": 2},
        {"id": 5, "text": "Go to the grocery store", "priority": 2},
        {"id": 6, "text": "Do some coding", "priority": 1},
        {"id": 7, "text": "Read a book", "priority": 1},
    ]
    return html.section(
        html.h1("My Todo List"),
        DataList(tasks, filter_by_priority=1, sort_by_priority=True),
        PrintButton("Play", "Playing"),
        PrintButton("Pause", "Paused"),
        ColorButton(),
        Counter()
    )


run(TodoList)


