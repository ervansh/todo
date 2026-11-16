import tempfile
import unittest
from pathlib import Path

from app import create_app


class TodoApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        database = Path(self.temp_dir.name) / "test.sqlite3"
        self.app = create_app({"TESTING": True, "DATABASE": str(database)})
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def create_todo(self, title="Learn Flask"):
        return self.client.post("/api/todos", json={"title": title})

    def test_create_and_list_todos(self):
        response = self.create_todo("  Learn Flask  ")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["title"], "Learn Flask")
        self.assertFalse(response.json["completed"])
        self.assertEqual(self.client.get("/api/todos").json[0]["id"], response.json["id"])

    def test_rejects_empty_or_long_title(self):
        self.assertEqual(self.create_todo("   ").status_code, 400)
        self.assertEqual(self.create_todo("a" * 241).status_code, 400)

    def test_update_and_delete_todo(self):
        todo_id = self.create_todo().json["id"]

        updated = self.client.patch(
            f"/api/todos/{todo_id}", json={"completed": True}
        )
        self.assertTrue(updated.json["completed"])
        self.assertEqual(self.client.delete(f"/api/todos/{todo_id}").status_code, 204)
        self.assertEqual(self.client.get("/api/todos").json, [])

    def test_clear_completed_todos_keeps_active_todos(self):
        completed_id = self.create_todo("Done").json["id"]
        active_id = self.create_todo("Still working").json["id"]
        self.client.patch(f"/api/todos/{completed_id}", json={"completed": True})

        result = self.client.delete("/api/todos/completed")

        self.assertEqual(result.json["deleted"], 1)
        remaining = self.client.get("/api/todos").json
        self.assertEqual([todo["id"] for todo in remaining], [active_id])


if __name__ == "__main__":
    unittest.main()