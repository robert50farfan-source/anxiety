// Renderiza un consentimiento definido como secciones (v1.1 en adelante),
// con el mismo estilo que el documento v1.0.
export default function DocumentoConsentimiento({ secciones, encabezado, version }) {
  return (
    <div className="text-base leading-relaxed text-calm-800 px-5 py-6">
      <h1 className="text-base font-bold text-calm-800 mb-1">{encabezado.titulo}</h1>
      <p className="text-sm leading-relaxed text-calm-700 mb-6">{encabezado.subtitulo}</p>

      {secciones.map((s, i) => (
        <section key={s.titulo}>
          {i > 1 && <hr className="border-calm-200 my-6" />}
          <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">{s.titulo}</h2>
          {s.nota && <p className="text-sm leading-relaxed text-calm-700 mb-2 italic">{s.nota}</p>}
          <div className="space-y-2">
            {s.bloques.map((b, j) => {
              if (b.p)      return <p key={j} className="text-sm leading-relaxed text-calm-700">{b.p}</p>
              if (b.lista)  return (
                <ul key={j} className="list-disc pl-5 space-y-1 text-sm text-calm-700">
                  {b.lista.map(x => <li key={x}>{x}</li>)}
                </ul>
              )
              if (b.lineas) return (
                <p key={j} className="text-sm leading-relaxed text-calm-700">
                  {b.lineas.map((l, k) => <span key={k}>{l}{k < b.lineas.length - 1 && <br />}</span>)}
                </p>
              )
              return null
            })}
          </div>
        </section>
      ))}

      <hr className="border-calm-200 my-6" />
      <p className="text-xs text-calm-500 mt-4">Versión del documento: {version}</p>
    </div>
  )
}
