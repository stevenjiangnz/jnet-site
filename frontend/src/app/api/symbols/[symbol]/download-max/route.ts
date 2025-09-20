import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8002";
const API_KEY = process.env.API_KEY || "";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    // Call the stock-data-service to download all available historical data
    const downloadResponse = await fetch(
      `${API_BASE_URL}/download/${symbol}?period=max`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Failed to download historical data" },
        { status: downloadResponse.status }
      );
    }

    const result = await downloadResponse.json();

    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      records_downloaded: result.records || 0,
      start_date: result.start_date,
      end_date: result.end_date,
      message: `Downloaded ${result.records || 0} records from ${result.start_date} to ${result.end_date}`,
    });
  } catch (error) {
    console.error("Error downloading max data for symbol:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}