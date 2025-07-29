// src/app/api/inventory/entry/route.js
import { createClient } from "@/lib/supabase/server";
//import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  //const cookieStore = cookies();
  const supabase = await createClient();

  try {
    // 1. Obtener el usuario actual para registrar quién hizo el movimiento
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Obtener los datos del cuerpo de la petición
    const body = await request.json();
    const {
      name,
      product_type,
      quantity,
      grade,
      period,
      session,
      observations,
    } = body;

    // 3. Validación básica de datos
    if (!name || !quantity || !product_type) {
      return NextResponse.json(
        { error: "Nombre, cantidad y tipo son requeridos." },
        { status: 400 }
      );
    }

    // 4. Iniciar una transacción. Esto es más seguro con una función RPC.
    // Vamos a crear una función en Supabase para manejar esto de forma atómica.

    // --- SQL para la función en Supabase (ejecutar una vez en el editor SQL) ---
    /*
    CREATE OR REPLACE FUNCTION handle_inventory_entry(
      p_name TEXT,
      p_product_type TEXT,
      p_quantity INT,
      p_grade TEXT,
      p_period TEXT,
      p_session TEXT,
      p_observations TEXT,
      p_user_id UUID
    )
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_product_id UUID;
    BEGIN
      -- Busca si un producto idéntico ya existe
      SELECT id INTO v_product_id
      FROM products
      WHERE
        name = p_name AND
        product_type = p_product_type AND
        (grade IS NULL AND p_grade IS NULL OR grade = p_grade) AND
        (period IS NULL AND p_period IS NULL OR period = p_period) AND
        (session IS NULL AND p_session IS NULL OR session = p_session);
        
      -- Si no existe, créalo
      IF v_product_id IS NULL THEN
        INSERT INTO products (name, product_type, grade, period, session, observations)
        VALUES (p_name, p_product_type, p_grade, p_period, p_session, p_observations)
        RETURNING id INTO v_product_id;
      END IF;

      -- Registra el movimiento de entrada
      INSERT INTO inventory_movements (product_id, type, quantity, user_id, observations)
      VALUES (v_product_id, 'entrada', p_quantity, p_user_id, p_observations);
      
      RETURN json_build_object('success', true, 'product_id', v_product_id);
    END;
    $$;
    */
    console.log("Datos recibidos del formulario:", body);
    // 5. Llamar a la función RPC desde la API Route
    const { data, error } = await supabase.rpc("handle_inventory_entry", {
      p_name: name,
      p_product_type: product_type,
      p_quantity: quantity,
      p_grade: grade || null,
      p_period: period || null,
      p_session: session || null,
      p_observations: observations || null,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error en RPC handle_inventory_entry:", error);
      throw new Error("Error al procesar la entrada en la base de datos.");
    }

    return NextResponse.json({ message: "Entrada registrada con éxito", data });
  } catch (error) {
    console.error("Error en API /inventory/entry:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
