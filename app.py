import os
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        DATABASE=os.path.join(app.instance_path, "todos.sqlite3"),
    )

    if test_config is not None:
        app.config.update(test_config)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    def get_db():
        if "db" not in g:
            g.db = sqlite3.connect(app.config["DATABASE"])
            g.db.row_factory = sqlite3.Row
        return g.db

    def initialize_database():
        database = get_db()
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        database.commit()

    @app.teardown_appcontext
    def close_db(_error=None):
        database = g.pop("db", None)
        if database is not None:
            database.close()

    def todo_to_dict(todo):
        return {
            "id": todo["id"],
            "title": todo["title"],
            "completed": bool(todo["completed"]),
            "created_at": todo["created_at"],
        }

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/todos")
    def list_todos():
        todos = get_db().execute(
            "SELECT id, title, completed, created_at FROM todos ORDER BY id DESC"
        ).fetchall()
        return jsonify([todo_to_dict(todo) for todo in todos])

    @app.post("/api/todos")
    def create_todo():
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        if not isinstance(title, str) or not title.strip():
            return jsonify({"error": "Add a task title first."}), 400
        if len(title.strip()) > 240:
            return jsonify({"error": "Task titles must be 240 characters or fewer."}), 400

        database = get_db()
        cursor = database.execute(
            "INSERT INTO todos (title) VALUES (?)", (title.strip(),)
        )
        database.commit()
        todo = database.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        return jsonify(todo_to_dict(todo)), 201

    @app.patch("/api/todos/<int:todo_id>")
    def update_todo(todo_id):
        data = request.get_json(silent=True) or {}
        completed = data.get("completed")
        if not isinstance(completed, bool):
            return jsonify({"error": "Completed must be true or false."}), 400

        database = get_db()
        cursor = database.execute(
            "UPDATE todos SET completed = ? WHERE id = ?",
            (int(completed), todo_id),
        )
        database.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found."}), 404

        todo = database.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (todo_id,),
        ).fetchone()
        return jsonify(todo_to_dict(todo))

    @app.delete("/api/todos/<int:todo_id>")
    def delete_todo(todo_id):
        database = get_db()
        cursor = database.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        database.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found."}), 404
        return "", 204

    @app.delete("/api/todos/completed")
    def delete_completed_todos():
        database = get_db()
        cursor = database.execute("DELETE FROM todos WHERE completed = 1")
        database.commit()
        return jsonify({"deleted": cursor.rowcount})

    with app.app_context():
        initialize_database()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)