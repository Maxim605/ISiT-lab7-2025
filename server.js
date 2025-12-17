require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { convertDotToJson } = require('./convert-dot-to-json');

function execSpawn(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: false, ...options });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
    
    if (options.timeout) {
      setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('Command timed out'));
      }, options.timeout);
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/graph', (req, res) => {
  try {
    const graphPath = path.join(__dirname, 'graph.json');
    
    if (!fs.existsSync(graphPath)) {
      return res.status(404).json({ error: 'Файл graph.json не найден' });
    }
    
    const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    
    const formattedData = {
      nodes: graphData.nodes,
      links: graphData.links.map(link => ({
        source: link.source,
        target: link.target,
        label: link.label || null
      }))
    };
    
    res.json(formattedData);
  } catch (error) {
    console.error('Ошибка при получении данных графа:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trace', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать массив URL' });
    }
    
    const escapedUrls = urls.map(url => {
      if (!/^[a-zA-Z0-9.-]+$/.test(url)) {
        throw new Error(`Некорректный URL: ${url}`);
      }
      return url;
    });
    
    const wslPath = __dirname.replace(/\\/g, '/').replace(/^([A-Z]):/, (match, drive) => `/mnt/${drive.toLowerCase()}`);
    
    const dotPath = path.join(__dirname, 'tracemap.dot');
    if (fs.existsSync(dotPath)) {
      fs.unlinkSync(dotPath);
    }
    
    const sudoPassword = process.env.SUDO_PASSWORD || 'admin';
    
    const echoCommands = escapedUrls.map(url => {
      const escaped = url.replace(/'/g, "'\\''");
      return `echo '${escaped}'`;
    }).join('; ');
    
    const bashScript = `cd '${wslPath}' && echo '${sudoPassword}' | sudo -S bash -c "(${echoCommands}) | /usr/bin/perl tracemap.pl"`;
    
    const { stdout, stderr } = await execSpawn('wsl', ['-d', 'Ubuntu', '-e', 'bash', '-c', bashScript], {
      cwd: __dirname,
      timeout: 600000
    });
      
      if (stderr && !stderr.includes('sudo') && !stderr.includes('wsl:') && !stderr.includes('Unknown key')) {
        console.warn('Предупреждение от tracemap.pl:', stderr);
      }
      
      if (stdout) {
        console.log('Вывод tracemap.pl:', stdout);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!fs.existsSync(dotPath)) {
        return res.status(500).json({ 
          error: 'Файл tracemap.dot не был создан. Проверьте, что tracemap.pl работает корректно и имеет права sudo.' 
        });
      }
      
      const dotContent = fs.readFileSync(dotPath, 'utf-8');
      if (!dotContent || dotContent.trim().length === 0) {
        return res.status(500).json({ 
          error: 'Файл tracemap.dot пуст. Возможно, трассировка не удалась. Проверьте права sudo и доступность сети.' 
        });
      }
      
      const jsonPath = path.join(__dirname, 'graph.json');
      const graph = convertDotToJson(dotPath, jsonPath);
      
      const formattedData = {
        nodes: graph.nodes,
        links: graph.links.map(link => ({
          source: link.source,
          target: link.target,
          label: link.label || null
        }))
      };
      
      res.json(formattedData);
  } catch (error) {
    console.error('Ошибка при выполнении трассировки:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже занят. Попробуйте использовать другой порт или остановите процесс, использующий этот порт.`);
    console.error(`Для Windows: netstat -ano | findstr :${PORT} - найти PID, затем taskkill /PID <PID> /F`);
    process.exit(1);
  } else {
    throw err;
  }
});

