import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType, existingItems } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the item list context for better matching
    const itemListContext = existingItems?.length
      ? `\n\nExisting inventory items for matching:\n${existingItems.map((i: any) => `- "${i.item_name}" (unit: ${i.unit}, id: ${i.id})`).join("\n")}`
      : "";

    const systemPrompt = `You are an expert at reading Indian construction challans (delivery receipts/invoices). Extract all line items from the challan image.

For each item, extract:
- item_name: The material/product name as written
- quantity: The numeric quantity delivered
- unit: The unit of measurement (bags, kg, pcs, tons, sheets, etc.)
- rate: Price per unit if visible (null if not)
- amount: Total amount if visible (null if not)

Also extract:
- challan_no: The challan/invoice number if visible
- supplier_name: The supplier/vendor name if visible
- date: The date on the challan if visible
- vehicle_no: Vehicle number if visible

IMPORTANT: Try to match item names to existing inventory items when possible. If an extracted item closely matches an existing inventory item, use the existing item's exact name and id.
${itemListContext}

Respond using the extract_challan_data tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Read this challan and extract all items with their quantities. Match items to existing inventory where possible.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_challan_data",
              description: "Extract structured data from a challan/delivery receipt",
              parameters: {
                type: "object",
                properties: {
                  challan_no: { type: "string", description: "Challan/invoice number" },
                  supplier_name: { type: "string", description: "Supplier/vendor name" },
                  date: { type: "string", description: "Date on the challan" },
                  vehicle_no: { type: "string", description: "Vehicle number" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item_name: { type: "string", description: "Material/product name" },
                        matched_inventory_id: {
                          type: "string",
                          description: "ID of matched existing inventory item, or null if no match",
                        },
                        matched_inventory_name: {
                          type: "string",
                          description: "Name of matched existing inventory item, or null",
                        },
                        quantity: { type: "number", description: "Quantity delivered" },
                        unit: { type: "string", description: "Unit of measurement" },
                        rate: { type: "number", description: "Price per unit if visible" },
                        amount: { type: "number", description: "Total amount if visible" },
                      },
                      required: ["item_name", "quantity", "unit"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_challan_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const challanData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(challanData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("read-challan error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
