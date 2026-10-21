import ConsentimientoV1_0, { TEXTO_PLANO_V1_0 } from './v1_0'
import DocumentoConsentimiento from './DocumentoConsentimiento'
import * as V1_1 from './v1_1'

// Registro de versiones del consentimiento: versión → { Componente, texto plano }.
// La versión mostrada y registrada la decide VERSION_CONSENTIMIENTO_VIGENTE.
export const CONSENTIMIENTOS = {
  'v1.0': { Componente: ConsentimientoV1_0, texto: TEXTO_PLANO_V1_0 },
  'v1.1': {
    Componente: () => <DocumentoConsentimiento secciones={V1_1.SECCIONES} encabezado={V1_1.ENCABEZADO} version={V1_1.VERSION} />,
    texto: V1_1.TEXTO_PLANO_V1_1,
  },
}
