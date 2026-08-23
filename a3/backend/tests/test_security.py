import pytest

from app.core.security import resolve_storage_path, sanitize_filename


def test_sanitize_filename_removes_traversal_and_spaces():
    assert sanitize_filename("../../My Sales.csv") == "My_Sales.csv"


def test_resolve_storage_path_stays_inside_root(tmp_path):
    target = resolve_storage_path(str(tmp_path), "nested/data.csv")
    assert target.parent == (tmp_path / "nested").resolve()


def test_resolve_storage_path_rejects_traversal(tmp_path):
    with pytest.raises(ValueError, match="escapes"):
        resolve_storage_path(str(tmp_path), "../../secret.txt")
