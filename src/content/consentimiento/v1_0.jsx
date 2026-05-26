export const TEXTO_PLANO_V1_0 = `CONSENTIMIENTO INFORMADO PARA PARTICIPACIÓN EN INVESTIGACIÓN
Universidad Autónoma Juan Misael Saracho — Doctorado en Ciencias

INVESTIGADOR RESPONSABLE
MSc. Luis Robert Farfán Sivila
Doctorado en Ciencias — Universidad Autónoma Juan Misael Saracho
Correo: robert50.farfan@gmail.com
Teléfono: 77894423

TUTORA DE TESIS
Ph.D. Liliana Ximena Ayarde Ponce

---

PROPÓSITO DEL ESTUDIO

Esta investigación evalúa si un asistente virtual inteligente puede ayudar a estudiantes universitarios de la Facultad de Ingeniería en Recursos Naturales y Tecnología a manejar episodios de ansiedad. Tu participación contribuirá al desarrollo de herramientas accesibles de apoyo emocional.

---

QUÉ DATOS RECOGEMOS

Durante el estudio se registrará la siguiente información:
- Tus respuestas al Inventario de Ansiedad de Beck (BAI).
- Registros de tu estado de ánimo y de episodios de ansiedad que reportes voluntariamente.
- Tu uso de los ejercicios disponibles en la aplicación (cuáles, cuándo, por cuánto tiempo).
- Si te corresponde acceso al chat con IA, los mensajes que intercambies.
- Fechas y horas de uso de la aplicación.

---

CONFIDENCIALIDAD

Tu identidad permanece anónima dentro de la aplicación. Esta no pide tu nombre, número de matrícula ni datos personales identificables. Solo el investigador principal conoce la asociación entre tu nombre y tu código de participante, mediante un registro físico resguardado bajo llave. Los resultados se publicarán de forma agregada, sin identificar a participantes individuales. Tu tutora académica del estudio tiene acceso de solo lectura a los datos agregados.

---

RIESGOS

La participación implica reflexionar sobre tu estado emocional, lo cual puede generar incomodidad temporal. Si en cualquier momento sientes malestar significativo, dispones de los recursos de ayuda profesional incluidos en la aplicación (línea nacional de salud mental y profesionales de apoyo del estudio). Puedes retirarte del estudio en cualquier momento sin consecuencias académicas ni de ningún tipo.

---

BENEFICIOS

Tendrás acceso a ejercicios de manejo de ansiedad basados en evidencia científica. Según el grupo al que seas asignado, podrías tener acceso adicional a un asistente conversacional con inteligencia artificial. No hay compensación económica por participar.

---

ASIGNACIÓN A GRUPOS

Esta investigación compara dos grupos de estudiantes. Tu asignación a un grupo es aleatoria y se hace antes de conocerte personalmente. Ambos grupos tienen acceso a ejercicios de manejo de ansiedad y recursos de ayuda profesional. La diferencia es el acceso al asistente conversacional. Al finalizar el estudio, si los resultados muestran beneficio, el grupo que no tuvo acceso podrá usar todas las funcionalidades.

---

VOLUNTARIEDAD Y RETIRO

Tu participación es totalmente voluntaria. Puedes retirarte en cualquier momento eliminando la aplicación o contactando al investigador para que tus datos sean eliminados. Tu retiro no afecta tu situación académica de ninguna manera.

---

USO DE INTELIGENCIA ARTIFICIAL

(Solo aplica al grupo con acceso al chat conversacional)

El chat conversacional usa un modelo de inteligencia artificial llamado Claude Haiku, desarrollado por Anthropic. Tus mensajes se envían a servidores externos para generar respuestas. Anthropic no usa estos mensajes para entrenar su modelo. El asistente NO es un profesional de salud mental, no realiza diagnósticos y no reemplaza terapia. Es una herramienta de apoyo complementario.

---

MANEJO DE EMERGENCIAS

Si la aplicación detecta señales de crisis o ideación de hacerte daño, te presentará recursos de ayuda profesional inmediata. El investigador recibe alertas anónimas cuando algún participante usa funciones de crisis, sin acceso al contenido específico de tus mensajes, para poder hacer seguimiento de seguridad. Si la situación lo amerita, el investigador podría contactar a través del profesional de apoyo del estudio.

---

CONSERVACIÓN Y ELIMINACIÓN DE DATOS

Los datos se conservarán durante 5 años después de la publicación de la tesis, conforme a las normas de investigación de la universidad. Después de ese plazo se eliminarán de forma segura. Puedes solicitar la eliminación anticipada de tus datos en cualquier momento contactando al investigador.

---

CONTACTO

Para preguntas, aclaraciones o solicitudes relacionadas con tu participación:

Investigador responsable:
MSc. Luis Robert Farfán Sivila
robert50.farfan@gmail.com
77894423

---

Versión del documento: v1.0`

export default function ConsentimientoV1_0() {
  return (
    <div className="text-base leading-relaxed text-calm-800 px-5 py-6">
      <h1 className="text-base font-bold text-calm-800 mb-1">
        CONSENTIMIENTO INFORMADO PARA PARTICIPACIÓN EN INVESTIGACIÓN
      </h1>
      <p className="text-sm leading-relaxed text-calm-700 mb-6">
        Universidad Autónoma Juan Misael Saracho — Doctorado en Ciencias
      </p>

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Investigador Responsable
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        MSc. Luis Robert Farfán Sivila<br />
        Doctorado en Ciencias — Universidad Autónoma Juan Misael Saracho<br />
        Correo: robert50.farfan@gmail.com<br />
        Teléfono: 77894423
      </p>

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Tutora de Tesis
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Ph.D. Liliana Ximena Ayarde Ponce
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Propósito del Estudio
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Esta investigación evalúa si un asistente virtual inteligente puede ayudar a estudiantes universitarios de la Facultad de Ingeniería en Recursos Naturales y Tecnología a manejar episodios de ansiedad. Tu participación contribuirá al desarrollo de herramientas accesibles de apoyo emocional.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Qué Datos Recogemos
      </h2>
      <p className="text-sm leading-relaxed text-calm-700 mb-2">
        Durante el estudio se registrará la siguiente información:
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-calm-700">
        <li>Tus respuestas al Inventario de Ansiedad de Beck (BAI).</li>
        <li>Registros de tu estado de ánimo y de episodios de ansiedad que reportes voluntariamente.</li>
        <li>Tu uso de los ejercicios disponibles en la aplicación (cuáles, cuándo, por cuánto tiempo).</li>
        <li>Si te corresponde acceso al chat con IA, los mensajes que intercambies.</li>
        <li>Fechas y horas de uso de la aplicación.</li>
      </ul>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Confidencialidad
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Tu identidad permanece anónima dentro de la aplicación. Esta no pide tu nombre, número de matrícula ni datos personales identificables. Solo el investigador principal conoce la asociación entre tu nombre y tu código de participante, mediante un registro físico resguardado bajo llave. Los resultados se publicarán de forma agregada, sin identificar a participantes individuales. Tu tutora académica del estudio tiene acceso de solo lectura a los datos agregados.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Riesgos
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        La participación implica reflexionar sobre tu estado emocional, lo cual puede generar incomodidad temporal. Si en cualquier momento sientes malestar significativo, dispones de los recursos de ayuda profesional incluidos en la aplicación (línea nacional de salud mental y profesionales de apoyo del estudio). Puedes retirarte del estudio en cualquier momento sin consecuencias académicas ni de ningún tipo.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Beneficios
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Tendrás acceso a ejercicios de manejo de ansiedad basados en evidencia científica. Según el grupo al que seas asignado, podrías tener acceso adicional a un asistente conversacional con inteligencia artificial. No hay compensación económica por participar.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Asignación a Grupos
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Esta investigación compara dos grupos de estudiantes. Tu asignación a un grupo es aleatoria y se hace antes de conocerte personalmente. Ambos grupos tienen acceso a ejercicios de manejo de ansiedad y recursos de ayuda profesional. La diferencia es el acceso al asistente conversacional. Al finalizar el estudio, si los resultados muestran beneficio, el grupo que no tuvo acceso podrá usar todas las funcionalidades.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Voluntariedad y Retiro
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Tu participación es totalmente voluntaria. Puedes retirarte en cualquier momento eliminando la aplicación o contactando al investigador para que tus datos sean eliminados. Tu retiro no afecta tu situación académica de ninguna manera.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Uso de Inteligencia Artificial
      </h2>
      <p className="text-sm leading-relaxed text-calm-700 mb-2 italic">
        (Solo aplica al grupo con acceso al chat conversacional)
      </p>
      <p className="text-sm leading-relaxed text-calm-700">
        El chat conversacional usa un modelo de inteligencia artificial llamado Claude Haiku, desarrollado por Anthropic. Tus mensajes se envían a servidores externos para generar respuestas. Anthropic no usa estos mensajes para entrenar su modelo. El asistente NO es un profesional de salud mental, no realiza diagnósticos y no reemplaza terapia. Es una herramienta de apoyo complementario.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Manejo de Emergencias
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Si la aplicación detecta señales de crisis o ideación de hacerte daño, te presentará recursos de ayuda profesional inmediata. El investigador recibe alertas anónimas cuando algún participante usa funciones de crisis, sin acceso al contenido específico de tus mensajes, para poder hacer seguimiento de seguridad. Si la situación lo amerita, el investigador podría contactar a través del profesional de apoyo del estudio.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Conservación y Eliminación de Datos
      </h2>
      <p className="text-sm leading-relaxed text-calm-700">
        Los datos se conservarán durante 5 años después de la publicación de la tesis, conforme a las normas de investigación de la universidad. Después de ese plazo se eliminarán de forma segura. Puedes solicitar la eliminación anticipada de tus datos en cualquier momento contactando al investigador.
      </p>

      <hr className="border-calm-200 my-6" />

      <h2 className="text-sm font-bold text-calm-700 uppercase tracking-wide mt-6 mb-2">
        Contacto
      </h2>
      <p className="text-sm leading-relaxed text-calm-700 mb-2">
        Para preguntas, aclaraciones o solicitudes relacionadas con tu participación:
      </p>
      <p className="text-sm leading-relaxed text-calm-700">
        Investigador responsable:<br />
        MSc. Luis Robert Farfán Sivila<br />
        robert50.farfan@gmail.com<br />
        77894423
      </p>

      <hr className="border-calm-200 my-6" />

      <p className="text-xs text-calm-500 mt-4">Versión del documento: v1.0</p>
    </div>
  )
}
