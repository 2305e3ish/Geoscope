import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app
from services.metadata_store import load_jsonl, rebuild_sqlite
from services.vector_search import local_vector_search


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        records = load_jsonl()
        if records:
            try:
                rebuild_sqlite(records)
            except Exception:
                pass
            local_vector_search.load(force=False)

    def setUp(self):
        self.client = app.test_client()

    def test_search_endpoint(self):
        response = self.client.get("/api/search?q=antarctica&mode=auto")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn("results", payload)

    def test_assistant_endpoint(self):
        response = self.client.post("/api/assistant", json={"query": "antarctica sediment"})
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn("answer", payload)
        self.assertIn("citations", payload)


if __name__ == "__main__":
    unittest.main()
