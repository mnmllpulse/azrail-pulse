import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export type Language = 'en' | 'ru' | 'es' | 'de' | 'fr' | 'zh' | 'ja' | 'it' | 'ko';

export interface LanguageInfo {
  code: Language;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }
];

interface Translations {
  [key: string]: {
    [lang in Language]?: string;
  };
}

// Global dictionary with proper English names preserved, while translating all descriptors and UI labels
export const translations: Translations = {
  themeLight: {
    en: 'LIGHT', ru: 'СВЕТЛАЯ', es: 'CLARO', de: 'HELL', fr: 'CLAIR', zh: '浅色', ja: 'ライト', it: 'CHIARO', ko: '라이트'
  },
  themeDark: {
    en: 'DARK', ru: 'ТЕМНАЯ', es: 'OSCURO', de: 'DUNKEL', fr: 'SOMBRE', zh: '深色', ja: 'ダーク', it: 'SCURO', ko: '다크'
  },
  statusOnline: {
    en: 'STATUS: ONLINE', ru: 'СТАТУС: АКТИВЕН', es: 'ESTADO: ACTIVO', de: 'STATUS: AKTIV', fr: 'STATUT: ACTIF', zh: '状态: 在线', ja: 'ステータス: オンライン', it: 'STATO: ATTIVO', ko: '상태: 온라인'
  },
  domain: {
    en: 'DOMAIN', ru: 'ДОМЕН', es: 'DOMINIO', de: 'DOMÄNE', fr: 'DOMAINE', zh: '域名', ja: 'ドメイン', it: 'DOMINIO', ko: '도메인'
  },
  
  // Proper nouns kept in English across all languages
  webStudio: {
    en: 'WEB STUDIO', ru: 'WEB STUDIO', es: 'WEB STUDIO', de: 'WEB STUDIO', fr: 'WEB STUDIO', zh: 'WEB STUDIO', ja: 'WEB STUDIO', it: 'WEB STUDIO', ko: 'WEB STUDIO'
  },
  codeStudio: {
    en: 'CODE STUDIO', ru: 'CODE STUDIO', es: 'CODE STUDIO', de: 'CODE STUDIO', fr: 'CODE STUDIO', zh: 'CODE STUDIO', ja: 'CODE STUDIO', it: 'CODE STUDIO', ko: 'CODE STUDIO'
  },
  knowledgeHub: {
    en: 'KNOWLEDGE HUB', ru: 'KNOWLEDGE HUB', es: 'KNOWLEDGE HUB', de: 'KNOWLEDGE HUB', fr: 'KNOWLEDGE HUB', zh: 'KNOWLEDGE HUB', ja: 'KNOWLEDGE HUB', it: 'KNOWLEDGE HUB', ko: 'KNOWLEDGE HUB'
  },
  musicStudio: {
    en: 'MUSIC STUDIO', ru: 'MUSIC STUDIO', es: 'MUSIC STUDIO', de: 'MUSIC STUDIO', fr: 'MUSIC STUDIO', zh: 'MUSIC STUDIO', ja: 'MUSIC STUDIO', it: 'MUSIC STUDIO', ko: 'MUSIC STUDIO'
  },
  videoStudio: {
    en: 'VIDEO STUDIO', ru: 'VIDEO STUDIO', es: 'VIDEO STUDIO', de: 'VIDEO STUDIO', fr: 'VIDEO STUDIO', zh: 'VIDEO STUDIO', ja: 'VIDEO STUDIO', it: 'VIDEO STUDIO', ko: 'VIDEO STUDIO'
  },
  agentStudio: {
    en: 'AGENT STUDIO', ru: 'AGENT STUDIO', es: 'AGENT STUDIO', de: 'AGENT STUDIO', fr: 'AGENT STUDIO', zh: 'AGENT STUDIO', ja: 'AGENT STUDIO', it: 'AGENT STUDIO', ko: 'AGENT STUDIO'
  },
  imageStudio: {
    en: 'IMAGE STUDIO', ru: 'IMAGE STUDIO', es: 'IMAGE STUDIO', de: 'IMAGE STUDIO', fr: 'IMAGE STUDIO', zh: 'IMAGE STUDIO', ja: 'IMAGE STUDIO', it: 'IMAGE STUDIO', ko: 'IMAGE STUDIO'
  },
  pulseLab: {
    en: 'PULSE LAB', ru: 'PULSE LAB', es: 'PULSE LAB', de: 'PULSE LAB', fr: 'PULSE LAB', zh: 'PULSE LAB', ja: 'PULSE LAB', it: 'PULSE LAB', ko: 'PULSE LAB'
  },
  assetUniverse: {
    en: 'ASSET UNIVERSE', ru: 'ASSET UNIVERSE', es: 'ASSET UNIVERSE', de: 'ASSET UNIVERSE', fr: 'ASSET UNIVERSE', zh: 'ASSET UNIVERSE', ja: 'ASSET UNIVERSE', it: 'ASSET UNIVERSE', ko: 'ASSET UNIVERSE'
  },
  botManager: {
    en: 'BOT MANAGER', ru: 'BOT MANAGER', es: 'BOT MANAGER', de: 'BOT MANAGER', fr: 'BOT MANAGER', zh: 'BOT MANAGER', ja: 'BOT MANAGER', it: 'BOT MANAGER', ko: 'BOT MANAGER'
  },
  billingSubscriptions: {
    en: 'BILLING & SUBSCRIPTIONS', ru: 'BILLING & SUBSCRIPTIONS', es: 'BILLING & SUBSCRIPTIONS', de: 'BILLING & SUBSCRIPTIONS', fr: 'BILLING & SUBSCRIPTIONS', zh: 'BILLING & SUBSCRIPTIONS', ja: 'BILLING & SUBSCRIPTIONS', it: 'BILLING & SUBSCRIPTIONS', ko: 'BILLING & SUBSCRIPTIONS'
  },
  
  // Custom Modules
  swarmOrchestra: {
    en: 'SWARM ORCHESTRA', ru: 'SWARM ORCHESTRA', es: 'SWARM ORCHESTRA', de: 'SWARM ORCHESTRA', fr: 'SWARM ORCHESTRA', zh: 'SWARM ORCHESTRA', ja: 'SWARM ORCHESTRA', it: 'SWARM ORCHESTRA', ko: 'SWARM ORCHESTRA'
  },
  quantumMind: {
    en: 'QUANTUM MIND', ru: 'QUANTUM MIND', es: 'QUANTUM MIND', de: 'QUANTUM MIND', fr: 'QUANTUM MIND', zh: 'QUANTUM MIND', ja: 'QUANTUM MIND', it: 'QUANTUM MIND', ko: 'QUANTUM MIND'
  },
  dnaSequencer: {
    en: 'DNA SEQUENCER', ru: 'DNA SEQUENCER', es: 'DNA SEQUENCER', de: 'DNA SEQUENCER', fr: 'DNA SEQUENCER', zh: 'DNA SEQUENCER', ja: 'DNA SEQUENCER', it: 'DNA SEQUENCER', ko: 'DNA SEQUENCER'
  },
  realityEngine: {
    en: 'REALITY ENGINE', ru: 'REALITY ENGINE', es: 'REALITY ENGINE', de: 'REALITY ENGINE', fr: 'REALITY ENGINE', zh: 'REALITY ENGINE', ja: 'REALITY ENGINE', it: 'REALITY ENGINE', ko: 'REALITY ENGINE'
  },
  systemManifesto: {
    en: 'SYSTEM MANIFESTO', ru: 'SYSTEM MANIFESTO', es: 'SYSTEM MANIFESTO', de: 'SYSTEM MANIFESTO', fr: 'SYSTEM MANIFESTO', zh: 'SYSTEM MANIFESTO', ja: 'SYSTEM MANIFESTO', it: 'SYSTEM MANIFESTO', ko: 'SYSTEM MANIFESTO'
  },
  archiveHub: {
    en: 'ARCHIVE HUB', ru: 'ARCHIVE HUB', es: 'ARCHIVE HUB', de: 'ARCHIVE HUB', fr: 'ARCHIVE HUB', zh: 'ARCHIVE HUB', ja: 'ARCHIVE HUB', it: 'ARCHIVE HUB', ko: 'ARCHIVE HUB'
  },

  // Descriptions translated dynamically
  webStudioDesc: {
    en: 'Generate minimalist websites, landing pages, and UI components.',
    ru: 'Генерируйте минималистичные веб-сайты, лендинги и компоненты интерфейса.',
    es: 'Genere sitios web minimalistas, páginas de destino y componentes de interfaz de usuario.',
    de: 'Erstellen Sie minimalistische Websites, Landingpages und UI-Komponenten.',
    fr: 'Générez des sites Web minimalistes, des pages de destination et des composants d\'interface.',
    zh: '生成极简网站、落地页和用户界面组件。',
    ja: 'ミニマリストなウェブサイト、ランディングページ、UIコンポーネントを生成します。',
    it: 'Genera siti web minimalisti, landing page e componenti dell\'interfaccia utente.',
    ko: '미니멀한 웹사이트, 랜딩 페이지 및 UI 구성 요소를 생성합니다.'
  },
  codeStudioDesc: {
    en: 'AI-driven IDE with file explorer and GitHub integrations.',
    ru: 'Интеллектуальная среда разработки с проводником файлов и интеграцией с GitHub.',
    es: 'IDE impulsado por IA con explorador de archivos e integraciones de GitHub.',
    de: 'KI-gesteuertes IDE mit Datei-Explorer und GitHub-Integrationen.',
    fr: 'IDE piloté par l\'IA avec explorateur de fichiers et intégrations GitHub.',
    zh: '由人工智能驱动的集成开发环境，带文件资源管理器和GitHub集成。',
    ja: 'ファイルエクスプローラーとGitHub統合を備えたAI駆動のIDE。',
    it: 'IDE basata su IA con esploratore di file e integrazioni GitHub.',
    ko: '파일 탐색기 및 GitHub 연동 기능이 있는 AI 기반 IDE.'
  },
  knowledgeHubDesc: {
    en: 'RAG-ready central repository for documents and prompt assets.',
    ru: 'Центральный репозиторий для документов и промптов с поддержкой RAG.',
    es: 'Repositorio central listo para RAG para documentos y activos de indicaciones.',
    de: 'RAG-bereites zentrales Repository für Dokumente und Prompt-Assets.',
    fr: 'Dépôt central prêt pour RAG pour documents et actifs de prompt.',
    zh: '适用于 RAG 的文档和提示语资源中央仓库。',
    ja: 'ドキュメントとプロンプトアセットのためのRAG対応中央リポジトリ。',
    it: 'Repository centrale pronto per RAG per documenti e risorse di prompt.',
    ko: '문서 및 프롬프트 자산을 위한 RAG 지원 중앙 저장소.'
  },
  musicStudioDesc: {
    en: 'Synthesize tracks, generate neural audio, and mix fragments.',
    ru: 'Синтезируйте треки, генерируйте нейроаудио и микшируйте фрагменты.',
    es: 'Sintetice pistas, genere audio neural y mezcle fragmentos.',
    de: 'Synthetisieren Sie Tracks, generieren Sie neuronales Audio und mischen Sie Fragmente.',
    fr: 'Synthétisez des pistes, générez de l\'audio neuronal et mélangez des fragments.',
    zh: '合成音轨、生成神经音频并混音片段。',
    ja: 'トラックを合成し、ニューラルオーディオを生成し、フラグメントをミックスします。',
    it: 'Sintetizza tracce, genera audio neurale e mixa frammenti.',
    ko: '트랙을 합성하고, 신경망 오디오를 생성하며, 조각을 믹싱합니다.'
  },
  videoStudioDesc: {
    en: 'Render cinematic sequences and dynamic visual assets.',
    ru: 'Создавайте кинематографические сцены и динамические видеоматериалы.',
    es: 'Renderice secuencias cinematográficas y activos visuales dinámicos.',
    de: 'Rendern Sie filmische Sequenzen und dynamische visuelle Assets.',
    fr: 'Rendez des séquences cinématographiques et des ressources visuelles dynamiques.',
    zh: '渲染电影级序列和动态视觉资源。',
    ja: '映画のようなシーケンスとダイナミックなビジュアルアセットをレンダリングします。',
    it: 'Invia il rendering di sequenze cinematografiche e risorse visive dinamiche.',
    ko: '영화 같은 시퀀스 및 동적 시각적 자산을 렌더링합니다.'
  },
  agentStudioDesc: {
    en: 'Design, customize, and deploy your own autonomous AI agents.',
    ru: 'Проектируйте, настраивайте и развертывайте собственных автономных AI-агентов.',
    es: 'Diseñe, personalice y implemente sus propios agentes de IA autónomos.',
    de: 'Entwerfen, anpassen und bereiten Sie Ihre eigenen autonomen KI-Agenten vor.',
    fr: 'Concevez, personnalisez et déployez vos propres agents d\'IA autonomes.',
    zh: '设计、定制并部署您自己的自主AI代理。',
    ja: '独自の自律型AIエージェントを設計、カスタマイズ、展開します。',
    it: 'Progetta, personalizza e distribuisci i tuoi agenti IA autonomi.',
    ko: '나만의 자율형 AI 에이전트를 설계, 맞춤 설정 및 배포하세요.'
  },
  imageStudioDesc: {
    en: 'Generate, edit and enhance high quality images via AI.',
    ru: 'Генерируйте, редактируйте и улучшайте изображения высокого качества с помощью ИИ.',
    es: 'Genere, edite y mejore imágenes de alta calidad a través de IA.',
    de: 'Generieren, bearbeiten und verbessern Sie hochwertige Bilder mit KI.',
    fr: 'Générez, modifiez et améliorez des images de haute qualité via l\'IA.',
    zh: '通过人工智能生成、编辑和增强高质量图像。',
    ja: 'AIを介して高品質の画像を生成、編集、向上させます。',
    it: 'Genera, modifica e migliora immagini di alta qualità tramite IA.',
    ko: 'AI를 통해 고품질 이미지를 생성, 편집 및 향상시킵니다.'
  },
  pulseLabDesc: {
    en: 'Experiment, test models, and build custom AI workflows without limits.',
    ru: 'Экспериментируйте, тестируйте модели и создавайте кастомные рабочие процессы ИИ без ограничений.',
    es: 'Experimente, pruebe modelos y cree flujos de trabajo de IA personalizados sin límites.',
    de: 'Experimentieren Sie, testen Sie Modelle und erstellen Sie unbegrenzt benutzerdefinierte KI-Workflows.',
    fr: 'Expérimentez, testez des modèles et créez des flux de travail d\'IA personnalisés sans limites.',
    zh: '无限制地实验、测试模型并构建自定义AI工作流。',
    ja: '実験し、モデルをテストし、制限なしにカスタムAIワークフローを構築します。',
    it: 'Sperimenta, testa modelli e crea flussi di lavoro IA personalizzati senza limiti.',
    ko: '제한 없이 실험하고, 모델을 테스트하고, 사용자 정의 AI 워크플로우를 빌드하세요.'
  },
  assetUniverseDesc: {
    en: 'Access all visual, audio, and web assets in one unified ecosystem. Your primary gallery for all creative output.',
    ru: 'Доступ ко всем визуальным, аудио- и веб-активам в единой экосистеме. Ваша главная галерея творчества.',
    es: 'Acceda a todos los activos visuales, de audio y web en un ecosistema unificado. Su galería principal.',
    de: 'Greifen Sie auf alle visuellen, Audio- und Web-Assets in einem einheitlichen Ökosystem zu.',
    fr: 'Accédez à toutes les ressources visuelles, audio et Web dans un écosystème unifié.',
    zh: '在统一的生态系统中访问所有视觉、音频和网页资源。您的核心创作库。',
    ja: 'すべてのビジュアル、オーディオ、およびウェブアセットに1つの統合されたエコシステムでアクセスします。',
    it: 'Accedi a tutte le risorse visive, audio e web in un unico ecosistema unificato.',
    ko: '하나의 통합된 생태계에서 모든 시각, 오디오 및 웹 자산에 액세스하세요.'
  },

  // General Interface Labels
  gallery: {
    en: 'GALLERY', ru: 'ГАЛЕРЕЯ', es: 'GALERÍA', de: 'GALERIE', fr: 'GALERIE', zh: '图库', ja: 'ギャラリー', it: 'GALLERIA', ko: '갤러리'
  },
  history: {
    en: 'HISTORY', ru: 'ИСТОРИЯ', es: 'HISTORIAL', de: 'HISTORIE', fr: 'HISTORIQUE', zh: '历史', ja: '履歴', it: 'CRONOLOGIA', ko: '히스토리'
  },
  saveDraft: {
    en: 'SAVE DRAFT', ru: 'СОХРАНИТЬ ЧЕРНОВИК', es: 'GUARDAR BORRADOR', de: 'ENTWURF SPEICHERN', fr: 'SAUVEGARDER LE BROUILLON', zh: '保存草稿', ja: '下書き保存', it: 'SALVA BOZZA', ko: '임시 저장'
  },
  export: {
    en: 'EXPORT', ru: 'ЭКСПОРТ', es: 'EXPORTAR', de: 'EXPORTIEREN', fr: 'EXPORTER', zh: '导出', ja: 'エクスポート', it: 'ESPORTA', ko: '내보내기'
  },
  share: {
    en: 'SHARE', ru: 'ПОДЕЛИТЬСЯ', es: 'COMPARTIR', de: 'TEILEN', fr: 'PARTAGER', zh: '分享', ja: '共有', it: 'CONDIVIDI', ko: '공유'
  },
  delete: {
    en: 'DELETE', ru: 'УДАЛИТЬ', es: 'ELIMINAR', de: 'LÖSCHEN', fr: 'SUPPRIMER', zh: '删除', ja: '削除', it: 'ELIMINA', ko: '삭제'
  },
  voiceMode: {
    en: 'Toggle Voice Mode', ru: 'Голосовой режим', es: 'Modo de voz', de: 'Sprachmodus', fr: 'Mode vocal', zh: '语音模式', ja: '音声モード', it: 'Modalità vocale', ko: '음성 모드'
  },
  listening: {
    en: 'Listening...', ru: 'Слушаю...', es: 'Escuchando...', de: 'Hören...', fr: 'Écoute...', zh: '正在聆听...', ja: 'リッスン中...', it: 'Ascolto...', ko: '듣는 중...'
  },
  message: {
    en: 'Message', ru: 'Сообщение', es: 'Mensaje', de: 'Nachricht', fr: 'Message', zh: '消息', ja: 'メッセージ', it: 'Messaggio', ko: '메시지'
  },
  simulatedResponse: {
    en: 'Simulated Response', ru: 'Симулированный ответ', es: 'Respuesta simulada', de: 'Simulierte Antwort', fr: 'Réponse simulée', zh: '模拟响应', ja: 'シミュレートされた応答', it: 'Risposta simulata', ko: '시뮬레이션 응답'
  },
  systemArchitecture: {
    en: 'SYSTEM ARCHITECTURE', ru: 'СИСТЕМНАЯ АРХИТЕКТУРА', es: 'ARQUITECTURA DEL SISTEMA', de: 'SYSTEMARCHITEKTUR', fr: 'ARCHITECTURE DU SYSTÈME', zh: '系统架构', ja: 'システムアーキテクチャ', it: 'ARCHITETTURA DI SISTEMA', ko: '시스템 아키텍처'
  },
  legal: {
    en: 'LEGAL', ru: 'ЮРИДИЧЕСКАЯ ИНФОРМАЦИЯ', es: 'LEGAL', de: 'RECHTLICHES', fr: 'MENTIONS LÉGALES', zh: '法律条款', ja: '法的情報', it: 'NOTE LEGALI', ko: '법적 고지'
  },

  // Sidebar Titles
  nexusCommand: {
    en: 'NEXUS COMMAND', ru: 'КОМАНДОВАНИЕ NEXUS', es: 'COMANDO NEXUS', de: 'NEXUS BEFEHL', fr: 'COMMANDE NEXUS', zh: 'NEXUS 指令', ja: 'NEXUS コマンド', it: 'COMANDO NEXUS', ko: 'NEXUS 커맨드'
  },
  forgeStudios: {
    en: 'FORGE STUDIOS', ru: 'СТУДИИ СИНТЕЗА', es: 'ESTUDIOS FORGE', de: 'FORGE STUDIOS', fr: 'STUDIOS DE FORGE', zh: '精炼 студии', ja: 'FORGE スタジオ', it: 'FORGE STUDIOS', ko: 'FORGE 스튜디오'
  },
  systemUtilities: {
    en: 'SYSTEM UTILITIES', ru: 'СИСТЕМНЫЕ УТИЛИТЫ', es: 'UTILIDADES DEL SISTEMA', de: 'SYSTEM-WERKZEUGE', fr: 'UTILITAIRES SYSTÈME', zh: '系统实用程序', ja: 'システムユーティリティ', it: 'UTILITÀ DI SISTEMA', ko: '시스템 유틸리티'
  },
  globalSettings: {
    en: 'GLOBAL SETTINGS', ru: 'ГЛОБАЛЬНЫЕ НАСТРОЙКИ', es: 'CONFIGURACIÓN GLOBAL', de: 'GLOBALE EINSTELLUNGEN', fr: 'PARAMÈTRES GLOBAUX', zh: '全局设置', ja: 'グローバル設定', it: 'IMPOSTAZIONI GLOBALI', ko: '전역 설정'
  },
  upgradePlan: {
    en: 'UPGRADE PLAN', ru: 'ОБНОВИТЬ ТАРИФ', es: 'MEJORAR PLAN', de: 'PLAN UPGRADEN', fr: 'AMÉLIORER LE FORFAIT', zh: '升级方案', ja: 'プランをアップグレード', it: 'AGGIORNA PIANO', ko: '요금제 업그레이드'
  },
  searchMatrix: {
    en: 'Search matrix...', ru: 'Поиск по матрице...', es: 'Buscar en la matriz...', de: 'Matrix durchsuchen...', fr: 'Rechercher dans la matrice...', zh: '搜索矩阵...', ja: 'マトリックスを検索...', it: 'Cerca nella matrice...', ko: '매트릭스 검색...'
  },

  // Nav Items Translation
  commandCenterItem: {
    en: 'Command Center', ru: 'Центр Управления', es: 'Centro de Comando', de: 'Kommandozentrale', fr: 'Centre de Commande', zh: '控制中心', ja: 'コマンドセンター', it: 'Centro di Comando', ko: '커맨드 센터'
  },
  swarmCommanderItem: {
    en: 'Swarm Commander', ru: 'Командир Роя', es: 'Comandante de Enjambre', de: 'Schwarm-Kommandeur', fr: 'Commandant d\'Essaim', zh: '蜂群指挥官', ja: 'スウォームコマンダー', it: 'Comandante dello Sciame', ko: '스웜 커맨더'
  },
  quantumMindItem: {
    en: 'Quantum Mind', ru: 'Квантовый Разум', es: 'Mente Cuántica', de: 'Quanten-Verstand', fr: 'Esprit Quantique', zh: '量子思维', ja: 'クォンタムマインド', it: 'Mente Quantica', ko: '퀀텀 마인드'
  },
  dnaSequencerItem: {
    en: 'DNA Sequencer', ru: 'Секвенатор ДНК', es: 'Secuenciador de ADN', de: 'DNA-Sequenzierer', fr: 'Séquenceur d\'ADN', zh: 'DNA 测序仪', ja: 'DNA シーケンサー', it: 'Sequenziatore DNA', ko: 'DNA 시퀀서'
  },
  realityEngineItem: {
    en: 'Reality Engine', ru: 'Движок Реальности', es: 'Motor de Realidad', de: 'Realitäts-Engine', fr: 'Moteur de Réalité', zh: '现实引擎', ja: 'リアリティエンジン', it: 'Motore di Realtà', ko: '리얼리티 엔진'
  },
  systemManifestoItem: {
    en: 'System Manifesto', ru: 'Манифест Системы', es: 'Manifiesto del Sistema', de: 'Systemmanifest', fr: 'Manifeste du Système', zh: '系统宣言', ja: 'システムマニフェスト', it: 'Manifesto di Sistema', ko: '시스템 매니페스토'
  },
  archiveHubItem: {
    en: 'Archive Hub', ru: 'Архивный Хаб', es: 'Centro de Archivos', de: 'Archiv-Hub', fr: 'Hub d\'Archives', zh: '档案中心', ja: 'アーカイブハブ', it: 'Hub di Archivio', ko: '아카이브 허브'
  },

  // System Utilities Items
  adminPanelItem: {
    en: 'Admin Panel', ru: 'Панель Администратора', es: 'Panel de Admin', de: 'Admin-Konsole', fr: 'Panneau d\'Administration', zh: '管理员面板', ja: '管理パネル', it: 'Pannello Amministratore', ko: '관리자 패널'
  },
  coreDiagnosticsItem: {
    en: 'Core Diagnostics', ru: 'Диагностика Ядра', es: 'Diagnóstico de Núcleo', de: 'Kern-Diagnose', fr: 'Diagnostic du Noyau', zh: '核心诊断', ja: 'コア診断', it: 'Diagnostica Core', ko: '코어 진단'
  },
  pulseWaveItem: {
    en: 'Pulse Wave', ru: 'Импульсная Волна', es: 'Onda de Pulso', de: 'Pulswelle', fr: 'Onde de Pouls', zh: '脉冲波形', ja: 'パルスウェーブ', it: 'Onda d\'Impulso', ko: '펄스 웨이브'
  },
  neuralTimelineItem: {
    en: 'Neural Timeline', ru: 'Нейронная Хроника', es: 'Línea de Tiempo Neural', de: 'Neuronale Zeitachse', fr: 'Chronologie Neurale', zh: '神经时间线', ja: 'ニューラルタイムライン', it: 'Cronologia Neurale', ko: '신경망 타임라인'
  },
  neuralMemoryItem: {
    en: 'Neural Memory', ru: 'Нейронная Память', es: 'Memoria Neural', de: 'Neuronaler Speicher', fr: 'Mémoire Neurale', zh: '神经内存', ja: 'ニューラルメモリ', it: 'Memoria Neurale', ko: '신경망 메모리'
  },
  pulseThemesItem: {
    en: 'Pulse Themes', ru: 'Темы Импульса', es: 'Temas de Pulso', de: 'Puls-Themes', fr: 'Thèmes de Pouls', zh: '脉冲主题', ja: 'パルス・テーマ', it: 'Temi d\'Impulso', ko: '펄스 테마'
  },
  osSettingsItem: {
    en: 'OS Settings', ru: 'Параметры ОС', es: 'Ajustes del SO', de: 'Betriebssystem-Optionen', fr: 'Configuration de l\'OS', zh: '系统设置', ja: 'OS設定', it: 'Impostazioni SO', ko: 'OS 설정'
  },
  
  // Dashboard Titles & Cards
  telemetryZoneTitle: {
    en: 'Telemetry Zone', ru: 'Зона Телеметрии', es: 'Zona de Telemetría', de: 'Telemetriezone', fr: 'Zone de Télémétrie', zh: '遥测区域', ja: 'テレメトリゾーン', it: 'Zona di Telemetria', ko: '원격 측정 구역'
  },
  azrailMemoryCoreTitle: {
    en: 'Azrail Memory Core', ru: 'Ядро Памяти Azrail', es: 'Núcleo de Memoria Azrail', de: 'Azrail Speicherkern', fr: 'Noyau de Mémoire Azrail', zh: 'Azrail 内存核心', ja: 'Azrail メモリコア', it: 'Nucleo di Memoria Azrail', ko: 'Azrail 메모리 코어'
  },
  neuralMeshActive: {
    en: 'Neural orbital mesh active', ru: 'Нейронная орбитальная сеть активна', es: 'Malla orbital neural activa', de: 'Neuronales orbitales Netz aktiv', fr: 'Maillage orbital neural actif', zh: '神经轨道网格激活', ja: 'ニューラル軌道メッシュ稼働中', it: 'Maglia neurale orbitale attiva', ko: '신경망 궤도 메시 활성화'
  },
  nodeSymmetryStable: {
    en: 'NODE_SYMMETRY: STABLE', ru: 'СИММЕТРИЯ_УЗЛОВ: СТАБИЛЬНО', es: 'SIMETRÍA_DE_NODO: ESTABLE', de: 'KNOTENSYMMETRIE: STABIL', fr: 'SYMÉTRIE_DE_NŒUD: STABLE', zh: '节点对称: 稳定', ja: 'ノード対称性: 安定', it: 'SIMMETRIA_NODO: STABILE', ko: '노드 대칭: 안정'
  },
  systemTelemetryLog: {
    en: 'SYSTEM TELEMETRY LOG', ru: 'ЖУРНАЛ СИСТЕМНОЙ ТЕЛЕМЕТРИИ', es: 'REGISTRO DE TELEMETRÍA', de: 'SYSTEMTELEMETRIE-LOG', fr: 'LOG DE TÉLÉMÉTRIE SYSTÈME', zh: '系统遥测日志', ja: 'システムテレメトリログ', it: 'REGISTRO TELEMETRIA SISTEMA', ko: '시스템 원격 측정 로그'
  },
  workspaceShadersTitle: {
    en: 'Workspace Shaders', ru: 'Шейдеры Рабочей Области'
  },
  selectNeuralEnvironmentMood: {
    en: 'Select Neural Environment Mood', ru: 'Выберите настроение нейронной среды'
  },
  dnaSequencerTitle: {
    en: 'Digital DNA Sequencer', ru: 'Секвенатор цифровой ДНК'
  },
  psychoProfileAnalysis: {
    en: 'Psychological Profile Analysis', ru: 'Анализ психологического профиля'
  },
  profileSynthesis: {
    en: 'Profile Synthesis', ru: 'Синтез профиля'
  },
  extractingPersonalityVectors: {
    en: 'Extracting personality vectors from system interactions.', ru: 'Извлечение векторов личности из системных взаимодействий.'
  },
  reSequenceProfile: {
    en: 'Re-Sequence Profile', ru: 'Повторить секвенирование'
  },
  analyzing: {
    en: 'Analyzing...', ru: 'Анализ...'
  },
  analyticalDepth: {
    en: 'Analytical depth', ru: 'Аналитическая глубина'
  },
  creativeChaos: {
    en: 'Creative chaos', ru: 'Творческий хаос'
  },
  emotionalResonance: {
    en: 'Emotional resonance', ru: 'Эмоциональный резонанс'
  },
  neuralPlasticity: {
    en: 'Neural plasticity', ru: 'Нейронная пластичность'
  },
  quantumMindTitle: {
    en: 'Quantum Mind', ru: 'Квантовый разум'
  },
  multiModelNeuralSynthesizer: {
    en: 'Multi-Model Neural Synthesizer', ru: 'Мультимодельный нейросинтезатор'
  },
  globalQueryInput: {
    en: 'Global Query Input', ru: 'Глобальный ввод запроса'
  },
  activateSynthesis: {
    en: 'Activate Synthesis', ru: 'Активировать синтез'
  },
  synthesizingNeuralPaths: {
    en: 'Synthesizing Neural Paths...', ru: 'Синтез нейронных путей...'
  },
  synthesisOutput: {
    en: 'Synthesis Output', ru: 'Вывод синтеза'
  },
  awaitingNeuralInjection: {
    en: 'Awaiting Neural Injection', ru: 'Ожидание нейронной инъекции'
  },
  awaitingNeuralInjectionDesc: {
    en: 'Input any prompt in the left field and activate synthesis to converge three major AI perspectives.', ru: 'Введите любой запрос в левом поле и активируйте синтез для конвергенции трех основных ИИ-перспектив.'
  },
  refinePath: {
    en: 'Refine Path', ru: 'Уточнить путь'
  },
  exportLogic: {
    en: 'Export Logic', ru: 'Экспорт логики'
  },
  swarmIntelligenceTitle: {
    en: 'SWARM INTELLIGENCE', ru: 'РАЗУМ РОЯ'
  },
  multiAgentCollaborativeChat: {
    en: 'MULTI-AGENT COLLABORATIVE CHAT', ru: 'МУЛЬТИАГЕНТСКИЙ СОВМЕСТНЫЙ ЧАТ'
  },
  neuralInsightsTitle: {
    en: 'Neural Insights', ru: 'Нейро-Инсайты'
  },
  styleBiasTitle: {
    en: 'Style Bias', ru: 'Стилевое смещение'
  },
  complexityScoreTitle: {
    en: 'Complexity Score', ru: 'Оценка сложности'
  },
  generationPatternsTitle: {
    en: 'Generation Patterns', ru: 'Паттерны генерации'
  },
  aestheticGenomeCalibrations: {
    en: 'Aesthetic Genome Calibrations', ru: 'Калибровка эстетического генома'
  },
  particleDensity: {
    en: 'PARTICLE DENSITY', ru: 'ПЛОТНОСТЬ ЧАСТИЦ'
  },
  chromaticNoise: {
    en: 'CHROMATIC NOISE', ru: 'ХРОМАТИЧЕСКИЙ ШУМ'
  },
  ambientExposure: {
    en: 'AMBIENT EXPOSURE', ru: 'ЭКСПОЗИЦИЯ СРЕДЫ'
  },
  structuralComplexity: {
    en: 'STRUCTURAL COMPLEXITY', ru: 'СТРУКТУРНАЯ СЛОЖНОСТЬ'
  },
  videoSequence: {
    en: 'Video Sequence', ru: 'Видеопоследовательность'
  },
  stillAsset: {
    en: 'Still Asset', ru: 'Статичный ассет'
  },
  manifestReality: {
    en: 'Manifest Reality', ru: 'Проявить реальность'
  },
  synthesizingQuantumMatrix: {
    en: 'Synthesizing Quantum Matrix...', ru: 'Синтез квантовой матрицы...'
  },
  neuralSynthesisInProgress: {
    en: 'Neural Synthesis in Progress', ru: 'Идет нейросинтез'
  },
  renderingSpacetimeCoordinates: {
    en: 'Rendering spacetime coordinates...', ru: 'Рендеринг пространственно-временных координат...'
  },
  awaitingManifestationCommand: {
    en: 'Awaiting Manifestation Command', ru: 'Ожидание команды проявления'
  },
  neuralFieldCalibration: {
    en: 'Neural Field Calibration', ru: 'Калибровка нейронного поля'
  },
  swarmInitialized: {
    en: 'Swarm initialized. All agents standing by.', ru: 'Рой инициализирован. Все агенты на связи.'
  },
  pulsePrimeGreeting: {
    en: 'Hello! I am Pulse Prime, your master orchestrator. How can our swarm assist you today?', ru: 'Здравствуйте! Я Pulse Prime, ваш главный оркестратор. Чем наш рой может помочь вам сегодня?'
  },
  askSwarmPlaceholder: {
    en: 'Ask the Swarm to build, analyze, or generate...', ru: 'Спросите Рой о создании, анализе или генерации...'
  },
  azrailSoulSwarmProtocol: {
    en: 'AZRAIL SOUL SWARM PROTOCOL ACTIVE', ru: 'ПРОТОКОЛ ДУШЕВНОГО РОЯ AZRAIL АКТИВЕН'
  },
  architecturalBlueprintTitle: {
    en: 'THE ARCHITECTURAL BLUEPRINT', ru: 'АРХИТЕКТУРНЫЙ ЧЕРТЕЖ'
  },
  tabManifesto: {
    en: '01 // Manifesto', ru: '01 // Манифест'
  },
  tabKernel: {
    en: '02 // Pulse Kernel', ru: '02 // Ядро Pulse'
  },
  tabStudiosSuite: {
    en: '03 // Studios Suite', ru: '03 // Пакет Студий'
  },
  tabImageStudioX: {
    en: '04 // Image Studio X', ru: '04 // Студия Изображений X'
  },
  tabCreativeEvolution: {
    en: '05 // Creative Evolution', ru: '05 // Творческая Эволюция'
  },
  
  // Infrastructure Hub
  infrastructureHub: {
    en: 'INFRASTRUCTURE HUB', ru: 'ИНФРАСТРУКТУРНЫЙ ХАБ'
  },
  infrastructureSub: {
    en: 'Cloudflare Integration & AI Model Management', ru: 'Интеграция Cloudflare и управление нейромоделями'
  },
  neuralModels: {
    en: 'Neural Models', ru: 'Нейромодели'
  },
  deployment: {
    en: 'Deployment', ru: 'Развертывание'
  },
  totalRequests: {
    en: 'Total Requests', ru: 'Всего запросов'
  },
  threatsBlocked: {
    en: 'Threats Blocked', ru: 'Угроз заблокировано'
  },
  edgeLatency: {
    en: 'Edge Latency', ru: 'Задержка Edge'
  },
  activeDomains: {
    en: 'Active Domains', ru: 'Активные домены'
  },
  edgeWorkers: {
    en: 'Edge Workers', ru: 'Edge Workers'
  },
  addDomain: {
    en: 'Add Domain', ru: 'Добавить домен'
  },
  viewLogs: {
    en: 'View Logs', ru: 'Просмотр логов'
  },
  configureKeys: {
    en: 'Configure Keys', ru: 'Настройка ключей'
  },
  syncCloudflare: {
    en: 'Sync Cloudflare', ru: 'Синхронизация Cloudflare'
  },
  syncing: {
    en: 'Syncing...', ru: 'Синхронизация...'
  },
  searchModelsPlaceholder: {
    en: 'Search {count} models...', ru: 'Поиск среди {count} моделей...'
  },
  allCategories: {
    en: 'All Categories', ru: 'Все категории'
  },
  deploymentManifest: {
    en: 'Deployment Manifest', ru: 'Манифест развертывания'
  },
  productionDomains: {
    en: 'Production Domains', ru: 'Продакшн домены'
  },
  currentVersion: {
    en: 'Current Version', ru: 'Текущая версия'
  },
  edgeProvider: {
    en: 'Edge Provider', ru: 'Edge-провайдер'
  },
  lastBroadcast: {
    en: 'Last Broadcast', ru: 'Последний сигнал'
  },
  systemSyncComplete: {
    en: 'System synchronization: 100% complete', ru: 'Системная синхронизация: 100% завершена'
  },
  rollbackTo: {
    en: 'Rollback to {version}', ru: 'Откат к {version}'
  },
  deployToCustom: {
    en: 'Deploy to Custom Domains', ru: 'Развернуть на доменах'
  },
  liveOnEdge: {
    en: 'Live on Edge', ru: 'Активен в Edge'
  },
  dnsSecured: {
    en: 'DNS Secured', ru: 'DNS защищен'
  },
  noModelsFound: {
    en: 'No neural models matching your criteria', ru: 'Нейромодели по вашему запросу не найдены'
  },
  securityLevel: {
    en: 'Security Level', ru: 'Уровень безопасности'
  },
  wafActive: {
    en: 'High (WAF Active)', ru: 'Высокий (WAF активен)'
  },
  manageDns: {
    en: 'Manage DNS', ru: 'Управление DNS'
  },
  noRoutesAssigned: {
    en: 'No routes assigned', ru: 'Маршруты не назначены'
  },
  lastDeployed: {
    en: 'Last Deployed', ru: 'Развернуто'
  },
  active: {
    en: 'Active', ru: 'Активен'
  },
  disabled: {
    en: 'Disabled', ru: 'Отключен'
  },
  details: {
    en: 'Details', ru: 'Подробнее'
  },
  orchestratingEdge: {
    en: 'Orchestrating edge delivery across global custom domains.', ru: 'Оркестрация доставки контента через глобальные домены.'
  },
  syncError: {
    en: 'Failed to sync with Cloudflare. Please check your API keys.', ru: 'Ошибка синхронизации с Cloudflare. Проверьте API-ключи.'
  },
  appTitle: {
    en: 'DARK MNMLL PULSE OS', ru: 'DARK MNMLL PULSE OS'
  },
  botsNetwork: {
    en: 'Bots Network', ru: 'Сеть ботов'
  },
  billingAndPlans: {
    en: 'Billing & Plans', ru: 'Биллинг и тарифы'
  },
  accentColor: {
    en: 'ACCENT COLOR', ru: 'АКЦЕНТНЫЙ ЦВЕТ'
  },
  neuralLoad: {
    en: 'NEURAL LOAD', ru: 'НЕЙРОННАЯ НАГРУЗКА'
  },
  'Text Models': {
    en: 'Text Models', ru: 'Текстовые модели'
  },
  'Vision Models': {
    en: 'Vision Models', ru: 'Визуальные модели'
  },
  'Audio Models': {
    en: 'Audio Models', ru: 'Аудио-модели'
  },
  'Video Models': {
    en: 'Video Models', ru: 'Видео-модели'
  },
  'Code Models': {
    en: 'Code Models', ru: 'Модели кода'
  },
  'Embeddings': {
    en: 'Embeddings', ru: 'Эмбеддинги'
  },
  connectModel: {
    en: 'Connect', ru: 'Подключить'
  },
  connected: {
    en: 'Connected', ru: 'Подключено'
  },
  disconnect: {
    en: 'Disconnect', ru: 'Отключить'
  },
  activeNeuralCore: {
    en: 'Active Neural Core', ru: 'Активное нейроядро'
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTranslating: boolean;
  smartTranslate: (targetLang: Language) => Promise<void>;
  getUserGuide: (section: string) => { title: string; steps: string[]; desc: string };
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'ru';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string) => {
    if (!key || typeof key !== 'string') {
      return '';
    }
    if (translations[key]) {
      return translations[key][language];
    }
    // Check if key itself represents a standard term
    const matchedKey = Object.keys(translations).find(k => k.toLowerCase() === key.toLowerCase());
    if (matchedKey) {
      return translations[matchedKey][language];
    }
    return key;
  };

  const smartTranslate = async (targetLang: Language) => {
    setIsTranslating(true);
    toast.loading(`Neural AI is translating UI into ${LANGUAGES.find(l => l.code === targetLang)?.name}...`);
    
    // Simulate complex neural translation model delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setLanguage(targetLang);
    setIsTranslating(false);
    toast.dismiss();
    toast.success(`Matrix translated to ${LANGUAGES.find(l => l.code === targetLang)?.name} successfully!`);
  };

  // Dedicated brief manual structure built in for all modules & studios in Dark Mnmll Pulse OS
  const getUserGuide = (section: string) => {
    const guides: Record<string, { en: { title: string; desc: string; steps: string[] }; ru: { title: string; desc: string; steps: string[] } }> = {
      dashboard: {
        en: {
          title: "Command Center & Telemetry Guide",
          desc: "Manage the central operating module of Dark Mnmll Pulse OS. Includes direct diagnostics, real-time node maps and custom system logs.",
          steps: [
            "Observe node map signals to trace live processes.",
            "Use the 'Core Diagnostics' tool to query server threads.",
            "Toggle display scaling settings for custom micro-animations."
          ]
        },
        ru: {
          title: "Руководство по Центру Управления и Телеметрии",
          desc: "Управляйте центральным операционным модулем Dark Mnmll Pulse OS. Включает диагностику, живую карту узлов и системные логи.",
          steps: [
            "Наблюдайте за сигналами карты узлов для отслеживания активных процессов.",
            "Используйте утилиту 'Core Diagnostics' для опроса системных потоков.",
            "Переключайте параметры масштабирования для кастомизации микроанимаций."
          ]
        }
      },
      web: {
        en: {
          title: "WEB STUDIO Operational Manual",
          desc: "Synthesize high-fidelity React code, Tailwind styling patterns, and dynamic frontend components instantly.",
          steps: [
            "Select active layout parameters using BentoForge.",
            "Specify visual goals using semantic prompts.",
            "Deploy and review output in the live iframe preview container."
          ]
        },
        ru: {
          title: "Руководство по WEB STUDIO",
          desc: "Мгновенно синтезируйте React-код, стили Tailwind и динамические компоненты интерфейса.",
          steps: [
            "Выбирайте параметры компоновки с помощью BentoForge.",
            "Определяйте визуальные цели с помощью семантических промптов.",
            "Развертывайте и проверяйте результат во встроенном iframe-контейнере."
          ]
        }
      },
      code: {
        en: {
          title: "CODE STUDIO Development Manual",
          desc: "Harness a comprehensive IDE featuring an interactive code editor, terminal logs, and directory structures.",
          steps: [
            "Navigate the workspace tree via the left directory panel.",
            "Write standard React/TypeScript or backend server modules.",
            "Verify syntax correctness using built-in linter tests."
          ]
        },
        ru: {
          title: "Инструкция по работе с CODE STUDIO",
          desc: "Полноценная среда разработки (IDE) со встроенным редактором кода, системным терминалом и файловым менеджером.",
          steps: [
            "Навигируйте по файловому дереву через левую панель директорий.",
            "Пишите стандартные модули на React/TypeScript или бэкенд Express.",
            "Проверяйте корректность синтаксиса с помощью встроенного линтера."
          ]
        }
      },
      knowledge: {
        en: {
          title: "KNOWLEDGE HUB & RAG System Guide",
          desc: "Store critical documents, index embeddings, and execute quality audits across vector indices.",
          steps: [
            "Upload files or enter textual knowledge blocks.",
            "Trigger 'Generate Embeddings' to prepare vector chunks.",
            "Run 'Auto-Correct & Optimize' to resolve quality and cognitive gaps."
          ]
        },
        ru: {
          title: "Инструкция по KNOWLEDGE HUB и системам RAG",
          desc: "Храните критические документы, индексируйте векторные эмбеддинги и проводите аудит качества данных.",
          steps: [
            "Загружайте файлы или вносите текстовые блоки знаний.",
            "Запускайте 'Generate Embeddings' для подготовки векторных чанков.",
            "Используйте кнопку 'Auto-Correct & Optimize' для исправления когнитивных пробелов."
          ]
        }
      },
      music: {
        en: {
          title: "MUSIC STUDIO Synthesizer Guide",
          desc: "Create dynamic neural loops, control ambient rhythms, and mix low-frequency neural patterns.",
          steps: [
            "Initialize the dynamic audio wave loop engine.",
            "Adjust BPM sliders and pulse density parameters.",
            "Export synthesized loops directly to your local file storage."
          ]
        },
        ru: {
          title: "Инструкция по MUSIC STUDIO",
          desc: "Создавайте динамические нейролупы, настраивайте фоновые ритмы и микшируйте низкочастотные сигналы.",
          steps: [
            "Инициализируйте звуковой движок для прослушивания волн.",
            "Регулируйте ползунки темпа BPM и плотности импульсов.",
            "Экспортируйте синтезированные дорожки напрямую в локальную систему."
          ]
        }
      },
      video: {
        en: {
          title: "VIDEO STUDIO Renderer Guide",
          desc: "Render cinematic visual sequences and procedurally generate high-definition frames.",
          steps: [
            "Select the active rendering model and timeline frame rates.",
            "Compose scenic descriptions with prompt guides.",
            "Preview and download output files in mp4 format."
          ]
        },
        ru: {
          title: "Инструкция по VIDEO STUDIO",
          desc: "Рендерите кинематографические визуальные последовательности и процедурно генерируйте кадры высокого разрешения.",
          steps: [
            "Выберите активную модель рендеринга и частоту кадров.",
            "Опишите сцену в текстовом поле промпта.",
            "Просматривайте и загружайте готовые файлы в формате mp4."
          ]
        }
      },
      agent: {
        en: {
          title: "AGENT STUDIO Configuration Guide",
          desc: "Design, instruct, and orchestrate autonomous agents to automate workflows.",
          steps: [
            "Launch the Agent Forge panel to create custom neural identities.",
            "Configure tools (Search, Code Executor, File Editor) for agents.",
            "Simulate multi-agent swarm chat rooms to orchestrate collaborative tasks."
          ]
        },
        ru: {
          title: "Инструкция по настройке AGENT STUDIO",
          desc: "Проектируйте, обучайте и оркеструйте автономных ИИ-агентов для автоматизации рабочих задач.",
          steps: [
            "Запустите панель Agent Forge для создания новых цифровых сущностей.",
            "Подключайте инструменты (Поиск, Редактор файлов, Компилятор) для агентов.",
            "Моделируйте совместную групповую беседу агентов в Swarm Orchestra."
          ]
        }
      },
      image: {
        en: {
          title: "IMAGE STUDIO Visual Creator Guide",
          desc: "Generate and edit artwork using diffusion models and high-contrast styling presets.",
          steps: [
            "Configure aspect ratios and sampling parameter sliders.",
            "Describe the artistic composition or modify reference layers.",
            "Apply smart filters like 'Glow' or 'Minimalist Contrast' in real-time."
          ]
        },
        ru: {
          title: "Инструкция по IMAGE STUDIO",
          desc: "Создавайте и редактируйте графику с использованием диффузионных моделей и контрастных пресетов.",
          steps: [
            "Настраивайте соотношение сторон и слайдеры сэмплирования.",
            "Опишите композицию текстом или загрузите референсный слой.",
            "Применяйте фильтры вроде 'Свечение' или 'Минималистичный Контраст'."
          ]
        }
      },
      lab: {
        en: {
          title: "PULSE LAB Experimental Sandbox",
          desc: "Explore non-linear physics simulations, neural mesh fields, and advanced sandbox calculations.",
          steps: [
            "Select active mathematical parameters for the liquid mesh canvas.",
            "Query raw JSON outputs of connected neural nodes.",
            "Perform stress testing on internal core API modules."
          ]
        },
        ru: {
          title: "Экспериментальная лаборатория PULSE LAB",
          desc: "Исследуйте нелинейные физические симуляции, нейронные поля и продвинутые песочницы расчетов.",
          steps: [
            "Задайте математические параметры для интерактивной сетки жидкого меша.",
            "Опрашивайте сырые JSON-ответы подключенных нейросетевых узлов.",
            "Проводите нагрузочные тесты внутренних программных интерфейсов ядра."
          ]
        }
      },
      gallery: {
        en: {
          title: "ASSET UNIVERSE & Gallery Manual",
          desc: "Query, sort, filter, and audit all media artifacts generated across Dark Mnmll Pulse OS.",
          steps: [
            "Select categorical filters (Audio, Video, Web, Code, Images).",
            "View detailed generation metadata, execution timelines, and seed properties.",
            "Export raw assets or publish them directly to external hosting environments."
          ]
        },
        ru: {
          title: "Руководство по ASSET UNIVERSE и Архивам",
          desc: "Просматривайте, фильтруйте, сортируйте и проверяйте медиа-активы, созданные в Dark Mnmll Pulse OS.",
          steps: [
            "Используйте категориальные фильтры (Звук, Видео, Веб, Код, Картинки).",
            "Изучайте подробные метаданные генерации, таймлайны и сиды.",
            "Экспортируйте файлы или публикуйте их во внешней среде."
          ]
        }
      }
    };

    const key = section.toLowerCase();
    const activeGuide = guides[key] || guides.dashboard;
    const currentLang = language === 'ru' ? 'ru' : 'en';
    return activeGuide[currentLang];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isTranslating, smartTranslate, getUserGuide }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
