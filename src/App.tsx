import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, Home, Users, MessageSquare, Target, Menu } from 'lucide-react';

// Mock data for prototype
const mockConversations = [
  {
    id: '1',
    title: 'Weekly Check-in with Emma',
    date: '2025-10-13',
    childName: 'Emma',
    summary: 'Emma shared excitement about her science project and expressed some concerns about an upcoming math test.',
    topics: ['Science Project', 'Math Test', 'School Anxiety'],
    goals: [
      { title: 'Complete science project', category: 'academic' },
      { title: 'Study for math test', category: 'academic' }
    ]
  },
  {
    id: '2',
    title: 'Soccer Practice Discussion',
    date: '2025-10-10',
    childName: 'Liam',
    summary: 'Liam talked about his soccer team and wanting to improve his passing skills.',
    topics: ['Soccer', 'Teamwork', 'Skills Development'],
    goals: [
      { title: 'Practice passing drills', category: 'sports' }
    ]
  }
];

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('⚠️ Audio recording is not supported in this environment. This feature works when deployed to your own domain (GitHub + Vercel).');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      visualize();
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setShowRecordingModal(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      alert('⚠️ Microphone access denied or not available. Please:\n\n1. Enable microphone permissions in your browser\n2. Make sure you\'re on HTTPS (required for microphone access)\n3. Deploy to Vercel for full functionality');
    }
  };

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording && !isPaused) return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current?.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = '#1F2937';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        canvasCtx.fillStyle = `rgb(59, 130, 246)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    
    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowRecordingModal(false);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      alert('✅ Recording uploaded! AI is analyzing your conversation...');
    }, 2000);
  };

  const cancelRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setShowRecordingModal(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
    setIsPaused(false);
  };

  const Dashboard = () => (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">12</div>
          <div className="text-sm text-gray-600">Conversations</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">8</div>
          <div className="text-sm text-gray-600">Active Goals</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-purple-600">15</div>
          <div className="text-sm text-gray-600">Topics</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-orange-600">5</div>
          <div className="text-sm text-gray-600">Follow-ups</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Recent Insights</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>💡 Emma shows increased confidence in science subjects</p>
          <p>💡 Liam is developing strong teamwork skills through sports</p>
          <p>💡 Weekly check-ins are improving communication patterns</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold text-gray-900 mb-3">Top Topics</h2>
        <div className="flex flex-wrap gap-2">
          {['School', 'Sports', 'Friends', 'Homework', 'Activities'].map(topic => (
            <span key={topic} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {topic}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const Conversations = () => (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <button
          onClick={startRecording}
          className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
        >
          <Mic className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        {mockConversations.map(conv => (
          <div key={conv.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{conv.title}</h3>
              <span className="text-xs text-gray-500">{conv.date}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{conv.summary}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {conv.topics.map(topic => (
                <span key={topic} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {topic}
                </span>
              ))}
            </div>
            <div className="text-xs text-blue-600 font-medium">
              {conv.goals.length} goal{conv.goals.length !== 1 ? 's' : ''} tracked
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Goals = () => (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Goals</h1>
      
      <div className="space-y-4">
        {mockConversations.flatMap(conv => 
          conv.goals.map((goal, idx) => (
            <div key={`${conv.id}-${idx}`} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600 rounded" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                  <p className="text-sm text-gray-600">{conv.childName}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {goal.category}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const Family = () => (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Family</h1>
      
      <div className="space-y-4">
        {['Emma', 'Liam'].map(name => (
          <div key={name} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {name[0]}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-600">Child</p>
              </div>
            </div>
          </div>
        ))}
        
        <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition">
          + Add Family Member
        </button>
      </div>
    </div>
  );

  const RecordingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isRecording && !audioBlob ? 'Recording...' : 'Recording Complete'}
          </h2>
          
          {isRecording && !audioBlob && (
            <>
              <canvas 
                ref={canvasRef} 
                width="300" 
                height="100" 
                className="w-full mb-4 rounded"
              />
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {formatTime(recordingTime)}
                </div>
                <div className="text-sm text-gray-600">
                  {isPaused ? 'Paused' : 'Recording...'}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={pauseRecording}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              </div>
            </>
          )}
          
          {audioBlob && !isProcessing && (
            <>
              <audio controls src={audioUrl || ''} className="w-full mb-4" />
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversation Title
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Weekly check-in with Emma"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Emma"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelRecording}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload & Analyze
                </button>
              </div>
            </>
          )}
          
          {isProcessing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Transcribing and analyzing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Compass</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </header>

      <main>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'conversations' && <Conversations />}
        {currentPage === 'goals' && <Goals />}
        {currentPage === 'family' && <Family />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
          {[
            { id: 'dashboard', icon: Home, label: 'Home' },
            { id: 'family', icon: Users, label: 'Family' },
            { id: 'conversations', icon: MessageSquare, label: 'Chats' },
            { id: 'goals', icon: Target, label: 'Goals' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition ${
                currentPage === id ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {showRecordingModal && <RecordingModal />}
    </div>
  );
};

export default App;