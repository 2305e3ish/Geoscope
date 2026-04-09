import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.query_parser import build_search_params, informative_query_terms, parse_query


class QueryParserTests(unittest.TestCase):
    def test_parse_query_extracts_year_and_region(self):
        keyword, year, region = parse_query("flood in India 2019")
        self.assertEqual(keyword, "flood in India")
        self.assertEqual(year, "2019")
        self.assertEqual(region, "india")

    def test_build_search_params_adds_filters(self):
        params = build_search_params("flood in India", "2019", "india", page_size=7)
        self.assertEqual(params["keyword"], "flood in India")
        self.assertEqual(params["page_size"], 7)
        self.assertIn("temporal", params)
        self.assertIn("bounding_box", params)

    def test_informative_query_terms_preserve_semantic_query(self):
        terms = informative_query_terms("Tohoku Tsunami 2011, Sendai Disaster")
        self.assertEqual(terms, ["tohoku", "tsunami", "sendai", "disaster"])


if __name__ == "__main__":
    unittest.main()
