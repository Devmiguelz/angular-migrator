# Angular Migrator CLI

Herramienta para migrar proyectos Angular de forma **progresiva y segura**, ejecutando `ng update` versión por versión con commits automáticos y validación de build en cada paso.

---

## ¿Qué hace?

- Lee la versión actual de Angular desde `package.json`
- Migra de forma incremental: `16 → 17 → 18 → 19 → 20`
- Ejecuta `npm run build` tras cada versión para validar que no se rompió nada
- Hace **1 commit por cada versión** migrada, en la misma rama
- Genera un **archivo de log** con todo lo que ocurre
- **Se detiene inmediatamente** si hay un error en cualquier paso
- **NO ejecuta**: standalone, control-flow, ni toca librerías externas

---

## Requisitos

- Node.js 14+
- Angular CLI disponible globalmente (`npm install -g @angular/cli`)
- Git instalado con el repositorio **limpio** (sin cambios sin commitear)

---

## Instalación

Copia los dos archivos en la **raíz de tu proyecto Angular**:

```
tu-proyecto/
├── migrate.js
├── migrator.config.json   ← configuración
├── package.json
└── ...
```

No requiere dependencias adicionales — usa solo módulos nativos de Node.js.

---

## Uso

```bash
node migrator.js
```

> Ejecutar siempre desde la raíz del proyecto Angular.

---

## Configuración (`migrator.config.json`)

```json
{
  "targetVersion": 20,
  "runNpmInstall": true,
  "npmInstallCommand": "npm install --legacy-peer-deps",
  "commitPerStep": true,
  "useForce": true,
  "logFile": "logs/migration.log"
}
```

| Campo | Tipo | Descripción | Default |
|-------|------|-------------|---------|
| `targetVersion` | `number` | Versión de Angular a la que se quiere llegar | `20` |
| `runNpmInstall` | `boolean` | Ejecutar el comando npm install tras cada migración | `true` |
| `npmInstallCommand` | `string` | Comando exacto de instalación | `"npm install --legacy-peer-deps"` |
| `commitPerStep` | `boolean` | Hacer commit automático tras cada versión migrada | `true` |
| `useForce` | `boolean` | Agrega `--force` al comando `ng update` | `true` |
| `logFile` | `string` | Ruta del archivo de log (la carpeta se crea automáticamente) | `"logs/migration.log"` |

---

## Flujo de ejecución

```
Inicio
  │
  ├─ Crea carpeta de logs si no existe
  ├─ Verifica que el repositorio Git esté limpio
  ├─ Lee versión actual desde package.json
  │
  └─ Loop: versión actual < versión destino
        │
        ├─ ng update @angular/core@N @angular/cli@N [--force]
        ├─ npm install --legacy-peer-deps   (si runNpmInstall: true)
        ├─ npm run build                    ← validación
        ├─ git add . && git commit          (si commitPerStep: true)
        │
        └─ siguiente versión...

Fin: "Migración completada con éxito"
```

Si **cualquier paso falla**, el script se detiene y registra el error en el log.

---

## Ejemplo de log generado

```
🚀 Iniciando migración Angular...

📌 Versión actual detectada: Angular 16
🎯 Versión objetivo: Angular 20

⬆️ Migrando a Angular 17...

▶ Ejecutando: ng update @angular/core@17 @angular/cli@17 --force
▶ Ejecutando: npm install --legacy-peer-deps
▶ Ejecutando: npm run build

⬆️ Migrando a Angular 18...
...

✅ Migración completada con éxito 🚀
```

El log se guarda en `logs/migration.log` (o la ruta configurada en `logFile`).

---

## Errores comunes

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `Hay cambios sin commit` | Repositorio con cambios pendientes | Hacer `git commit` o `git stash` |
| `❌ Error ejecutando: ng update` | Conflicto de dependencias | Revisar el log, intentar con `useForce: true` |
| `❌ Falló el build` | Cambio breaking en la migración | Revisar errores de compilación manualmente y corregir |
| `ng: command not found` | Angular CLI no instalado globalmente | `npm install -g @angular/cli` |

---

## Lo que NO hace (intencional)

Estas transformaciones **no se ejecutan** — requieren revisión manual caso a caso:

| Comando | Por qué se omite |
|---------|-----------------|
| `ng generate @angular/core:standalone` | Migración mayor, puede romper la arquitectura existente |
| `ng g @angular/core:control-flow` | Requiere revisión de cada template manualmente |
| Actualizar librerías externas (`@bancolombia/*`, etc.) | Cada librería tiene su propio ciclo de versiones |

---

## Después de la migración

1. Revisar y actualizar librerías externas manualmente
2. Ejecutar la suite de pruebas: `npm test`
3. Verificar la compilación final: `npm run build`
4. Consultar el [Angular Update Guide](https://update.angular.io/) para breaking changes específicos de cada versión
