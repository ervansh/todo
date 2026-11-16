# Daymark

A small todo app for learning Python web development. It uses Flask for the web server and API, SQLite for storage, and plain HTML, CSS, and JavaScript in the browser.

## Run locally

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000. The database is created at `instance/todos.sqlite3` on first run.

## Run tests

```powershell
python -m unittest discover -s tests -v
```

## Project map

- `app.py` creates the Flask app, initializes SQLite, and defines the JSON API.
- `templates/index.html` contains the page structure.
- `static/style.css` contains the responsive layout and visual styles.
- `static/app.js` handles browser interactions and calls the API.
- `tests/test_app.py` checks the API using temporary databases.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/todos` | List tasks |
| `POST` | `/api/todos` | Create a task with a JSON `title` |
| `PATCH` | `/api/todos/<id>` | Set `completed` to `true` or `false` |
| `DELETE` | `/api/todos/<id>` | Delete one task |
| `DELETE` | `/api/todos/completed` | Clear completed tasks |