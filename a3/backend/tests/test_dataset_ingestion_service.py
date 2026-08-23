import pytest

from app.services.dataset_ingestion_service import (
    analyze_dataset,
    detect_file_type,
    parse_tabular_bytes,
)


def test_detect_file_type_is_case_insensitive():
    assert detect_file_type("sales.CSV") == "csv"
    assert detect_file_type("events.tsv") == "tsv"
    assert detect_file_type("data") == "unknown"


def test_parse_csv_coerces_numeric_values():
    headers, rows = parse_tabular_bytes(
        b"name,revenue,count\nA,12.5,2\nB,8,3\n", "csv"
    )
    assert headers == ["name", "revenue", "count"]
    assert rows[0] == {"name": "A", "revenue": 12.5, "count": 2}


def test_parse_tsv():
    headers, rows = parse_tabular_bytes(b"name\tvalue\nA\t10\n", "tsv")
    assert headers == ["name", "value"]
    assert rows == [{"name": "A", "value": 10}]


def test_parse_json_array_of_objects():
    headers, rows = parse_tabular_bytes(b'[{"a": 1}, {"b": 2}]', "json")
    assert headers == ["a", "b"]
    assert rows == [{"a": 1, "b": None}, {"a": None, "b": 2}]


def test_rejects_invalid_json_shape():
    with pytest.raises(ValueError, match="array of objects"):
        parse_tabular_bytes(b'{"a": 1}', "json")


def test_analyze_dataset_health():
    result = analyze_dataset(b"a,b\n1,2\n3,\n", "data.csv")
    assert result["row_count"] == 2
    assert result["col_count"] == 2
    assert result["health_score"] == 75


def test_rejects_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported dataset type"):
        parse_tabular_bytes(b"hello", "xml")
