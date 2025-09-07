import os
import json
from datetime import date
from app.core.storage_manager import StorageManager
from app.models.stock import StockDataPoint


def test_ensure_directories(temp_data_dir):
    StorageManager.ensure_directories()
    assert os.path.exists(temp_data_dir)
    assert os.path.exists(f"{temp_data_dir}/stocks")


def test_save_stock_data_json(temp_data_dir):
    data_points = [
        StockDataPoint(
            date=date(2024, 1, 1),
            open=100.0,
            high=105.0,
            low=99.0,
            close=103.0,
            adj_close=103.0,
            volume=1000000,
        )
    ]

    file_path = StorageManager.save_stock_data("AAPL", data_points, "json")

    assert os.path.exists(file_path)
    assert file_path.endswith(".json")

    # Verify content
    with open(file_path, "r") as f:
        data = json.load(f)
        assert data["symbol"] == "AAPL"
        assert data["total_records"] == 1
        assert len(data["data_points"]) == 1


def test_save_stock_data_csv(temp_data_dir):
    data_points = [
        StockDataPoint(
            date=date(2024, 1, 1),
            open=100.0,
            high=105.0,
            low=99.0,
            close=103.0,
            adj_close=103.0,
            volume=1000000,
        )
    ]

    file_path = StorageManager.save_stock_data("AAPL", data_points, "csv")

    assert os.path.exists(file_path)
    assert file_path.endswith(".csv")


def test_get_latest_file_not_found(temp_data_dir):
    latest = StorageManager.get_latest_file("AAPL")
    assert latest is None


def test_list_available_symbols_empty(temp_data_dir):
    symbols = StorageManager.list_available_symbols()
    assert symbols == []


def test_list_available_symbols_with_data(temp_data_dir):
    # Create some test data
    data_points = [
        StockDataPoint(
            date=date(2024, 1, 1),
            open=100.0,
            high=105.0,
            low=99.0,
            close=103.0,
            adj_close=103.0,
            volume=1000000,
        )
    ]

    StorageManager.save_stock_data("AAPL", data_points)
    StorageManager.save_stock_data("GOOGL", data_points)

    symbols = StorageManager.list_available_symbols()
    assert len(symbols) == 2
    assert "AAPL" in symbols
    assert "GOOGL" in symbols


def test_delete_symbol_data(temp_data_dir):
    # Create test data
    data_points = [
        StockDataPoint(
            date=date(2024, 1, 1),
            open=100.0,
            high=105.0,
            low=99.0,
            close=103.0,
            adj_close=103.0,
            volume=1000000,
        )
    ]

    StorageManager.save_stock_data("AAPL", data_points)

    # Verify it exists
    assert "AAPL" in StorageManager.list_available_symbols()

    # Delete
    success = StorageManager.delete_symbol_data("AAPL")
    assert success is True

    # Verify it's gone
    assert "AAPL" not in StorageManager.list_available_symbols()


def test_delete_symbol_data_not_found(temp_data_dir):
    success = StorageManager.delete_symbol_data("NONEXISTENT")
    assert success is False


def test_get_storage_stats_empty(temp_data_dir):
    stats = StorageManager.get_storage_stats()
    assert stats["total_symbols"] == 0
    assert stats["total_files"] == 0
    assert stats["total_size_mb"] == 0
