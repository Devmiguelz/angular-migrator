const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

// 📂 Ruta donde está el script
const scriptDir = __dirname;

// 📂 Ruta del proyecto (argumento o actual)
const projectPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

console.log(`📂 Proyecto: ${projectPath}`);
console.log(`🧠 Script: ${scriptDir}`);

// Leer config desde el script (NO del proyecto)
const CONFIG = JSON.parse(fs.readFileSync(path.join(scriptDir, "migrator.config.json"), "utf-8"));

// Cambiar ejecución al proyecto
process.chdir(projectPath);

function log(message) {
  console.log(message);
  fs.appendFileSync(path.join(scriptDir, CONFIG.logFile), message + "\n");
}

function runCommand(command) {
  try {
    log(`\n▶ Ejecutando: ${command}`);
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    log(`❌ Error ejecutando: ${command}`);
    process.exit(1);
  }
}

function getAngularVersion() {
  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  const version = pkg.dependencies["@angular/core"] || pkg.devDependencies["@angular/core"];

  return parseInt(version.match(/\d+/)[0]);
}

function gitCommit(version) {
  if (!CONFIG.commitPerStep) return;

  runCommand("git add .");
  runCommand(`git commit -m "chore: upgrade to Angular ${version}"`);
}

function ensureLogFolder() {
  const dir = CONFIG.logFile.split("/")[0];
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function checkGitStatus(doCommit = false) {
  try {
    console.log("🔍 Verificando estado de Git...");

    const status = execSync("git status --porcelain").toString();

	if (status.trim() && doCommit) {
		console.log("📌 Realizando commit de los cambios actuales...");
      	runCommand("git add .");
      	runCommand('git commit -m "chore: commit previo a migración"');
	} else {
      if (status.trim()) {
        console.log("❌ Hay cambios sin commit en el repositorio:\n");
        console.log(status);

        console.log("\n🛑 Por favor haz commit o stash antes de continuar.");
        process.exit(1);
      }
    }

    console.log("✅ Repositorio limpio, continuando...\n");
  } catch (error) {
    console.log("⚠️ No se pudo verificar el estado de Git.");
    process.exit(1);
  }
}

function ensureDependencies() {
  const nodeModulesPath = path.join(projectPath, "node_modules");

  if (!fs.existsSync(nodeModulesPath)) {
    log("📦 node_modules no encontrado. Instalando dependencias...");

    runCommand(CONFIG.npmInstallCommand || "npm install --legacy-peer-deps");

    log("✅ Dependencias instaladas correctamente\n");
  } else {
    log("✅ node_modules ya existe, se omite instalación\n");
  }
}

function main() {
  ensureLogFolder();

  checkGitStatus();

  ensureDependencies();

  checkGitStatus(true);

  log("🚀 Iniciando migración Angular...\n");

  let currentVersion = getAngularVersion();
  const targetVersion = CONFIG.targetVersion;

  log(`📌 Versión actual detectada: Angular ${currentVersion}`);
  log(`🎯 Versión objetivo: Angular ${targetVersion}\n`);

  while (currentVersion < targetVersion) {
    const nextVersion = currentVersion + 1;

    log(`\n⬆️ Migrando a Angular ${nextVersion}...`);

    const forceFlag = CONFIG.useForce ? "--force" : "";

    runCommand(`ng update @angular/core@${nextVersion} @angular/cli@${nextVersion} ${forceFlag}`);

    if (CONFIG.runNpmInstall) {
      runCommand(CONFIG.npmInstallCommand);
    }

    // Validación básica
    try {
      runCommand("npm run build");
    } catch {
      log("❌ Falló el build. Abortando migración.");
      process.exit(1);
    }

    gitCommit(nextVersion);

    currentVersion = nextVersion;
  }

  log("\n✅ Migración completada con éxito 🚀");
}

main();
