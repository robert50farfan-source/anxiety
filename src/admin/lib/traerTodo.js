const PAGINA_BD = 1000 // límite de filas por respuesta de PostgREST

// Trae todas las filas paginando (PostgREST corta en 1000).
// `construirQuery` debe devolver una query nueva en cada llamada.
export async function traerTodo(construirQuery) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA_BD) {
    const { data, error } = await construirQuery().range(desde, desde + PAGINA_BD - 1)
    if (error) throw error
    filas.push(...(data ?? []))
    if (!data || data.length < PAGINA_BD) return filas
  }
}
