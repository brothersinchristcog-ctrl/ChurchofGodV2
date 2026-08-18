import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Dimensions, 
  Image, 
  Linking, 
  Share, 
  StatusBar, 
  Platform,
  InteractionManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import YoutubePlayer from 'react-native-youtube-iframe';
import { 
  ArrowLeft,
  ChevronLeft, 
  Share2, 
  Play, 
  Clock, 
  Video, 
  ExternalLink,
  ChevronRight,
  Heart
} from 'lucide-react-native';
import SalesforceService, { SalesforceVideo } from '../services/SalesforceService';

const { width } = Dimensions.get('window');

const VideoItem = React.memo(({ video, setActiveVideo }: any) => (
  <TouchableOpacity 
    style={styles.archiveItem}
    onPress={() => setActiveVideo(video)}
  >
    <View style={styles.thumbBox}>
      <Image 
        source={{ uri: `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg` }} 
        style={styles.thumb} 
      />
      <View style={styles.playIcon}><Play size={10} color="#fff" fill="#fff" /></View>
    </View>
    <View style={styles.itemInfo}>
      <Text style={styles.itemTitle} numberOfLines={1}>{video.title}</Text>
      <Text style={styles.itemMeta}>{video.date ? new Date(video.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} · {video.duration}</Text>
    </View>
    <ChevronRight size={16} color="#D1D5DB" />
  </TouchableOpacity>
));

export default function SermonVideoScreen({ navigation, route }: any) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<SalesforceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [activeVideo, setActiveVideo] = useState<SalesforceVideo | null>(null);
  const [readyToRender, setReadyToRender] = useState(false);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      setReadyToRender(true);
    });
    return () => interaction.cancel();
  }, []);

  // Initial load from params or fetch
  useEffect(() => {
    const paramId = route?.params?.youtubeId;
    const paramTitle = route?.params?.videoTitle;
    const paramPastor = route?.params?.pastor;

    if (paramId) {
      setActiveVideo({
        id: 'direct-' + paramId,
        title: paramTitle || 'Sermon',
        youtubeId: paramId,
        date: 'Today',
        duration: '',
        pastor: paramPastor || 'Brother Y. Rajesh'
      });
      setLoading(false);
    }

    const fetchArchive = async () => {
      try {
        const promiseData = await SalesforceService.getSermons(50);
        const data: SalesforceVideo[] = promiseData
          .filter(p => p.youtubeId && p.youtubeId !== 'mock')
          .map(p => ({
            id: p.id,
            title: p.title || 'Sermon',
            youtubeId: p.youtubeId,
            date: p.date,
            duration: p.duration || '',
            pastor: p.pastor || 'Brother Y. Rajesh'
          }));
        setVideos(data);
        
        if (!paramId && data.length > 0) {
          setActiveVideo(data[0]);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!paramId) setLoading(false);
      }
    };
    
    fetchArchive();
  }, [route?.params?.youtubeId]);

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') setPlaying(false);
  }, []);

  const handleShare = async () => {
    if (!activeVideo) return;
    try {
      await Share.share({
        message: `Watch this powerful teaching: "${activeVideo.title}" - https://youtu.be/${activeVideo.youtubeId}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSubscribe = () => {
    Linking.openURL('https://www.youtube.com/@Brothersinchristfellowship');
  };

  const archiveVideos = useMemo(() => {
    return videos.filter(v => v.id !== activeVideo?.id);
  }, [videos, activeVideo]);

  if (loading && !activeVideo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f0f2f7' }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? "#0a2350" : "#1a2d5a"} />
      
      {/* 🔥 Page Header 🔥 */}
      <LinearGradient
        colors={isDark ? ['#60a5fa', '#3b82f6', '#60a5fa'] : ['#1e40af', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          paddingBottom: 4,
          elevation: 8,
          shadowColor: '#030a1e',
          shadowOpacity: 0.75,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <View style={[styles.pageHeader, { backgroundColor: isDark ? '#0a2350' : '#1a2d5a', paddingTop: Math.max(insets.top, 20) + 10, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleCol}>
            <Text style={styles.pageTitle}>Sermon Video</Text>
            <Text style={styles.pageSub}>బోధనలు</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>
      </LinearGradient>

      <FlatList
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        data={archiveVideos}
        keyExtractor={item => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <>
            {/* ── Video Player ── */}
            <View style={styles.playerSection}>
              {readyToRender ? (
                <YoutubePlayer
                  height={width * 0.56}
                  play={playing}
                  videoId={activeVideo?.youtubeId || ''}
                  onChangeState={onStateChange}
                />
              ) : (
                <View style={{ height: width * 0.56, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator color="#fbbf24" />
                </View>
              )}
            </View>

            {/* ── Video Details ── */}
            <View style={styles.videoDetails}>
              <Text style={styles.videoTitle}>{activeVideo?.title || 'Walking in the Spirit'}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Play size={12} color="#c0392b" fill="#c0392b" />
                  <Text style={styles.metaTxt}>Featured Teaching</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={12} color="#6B7280" />
                  <Text style={styles.metaTxt}>{activeVideo?.date ? (activeVideo.date === 'Today' ? 'Today' : new Date(activeVideo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })) : 'Today'}</Text>
                </View>
              </View>

              <View style={styles.pastorCard}>
                <View style={styles.pastorAv}><Text style={styles.pastorAvTxt}>P</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pastorName}>{activeVideo?.pastor || 'Brother Y. Rajesh'}</Text>
                  <Text style={styles.pastorRole}>Main Speaker · COG</Text>
                </View>
                <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe}>
                  <Text style={styles.subBtnTxt}>Subscribe</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Share2 size={16} color="#fff" />
                <Text style={styles.shareBtnTxt}>Share this message</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.secLbl}>PAST SERMONS</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.archiveList}>
            <VideoItem video={item} setActiveVideo={setActiveVideo} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2d5a' },
  
  // Header
  pageHeader: {
    backgroundColor: '#1a2d5a',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  titleCol: { flex: 1, alignItems: 'center' },
  pageTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  pageSub: { color: '#aac4e8', fontSize: 12, marginTop: 2 },

  scroll: { paddingBottom: 40 },

  playerSection: { backgroundColor: '#000', width: '100%' },

  videoDetails: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  videoTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  pastorCard: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, 
    backgroundColor: '#f9fafb', borderRadius: 14, marginBottom: 15,
    borderWidth: 0.5, borderColor: '#e5e7eb'
  },
  pastorAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center' },
  pastorAvTxt: { color: '#fff', fontWeight: '700' },
  pastorName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  pastorRole: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  subBtn: { backgroundColor: '#1a2d5a', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  subBtnTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  shareBtn: { backgroundColor: '#c0392b', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  shareBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  secLbl: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6, marginHorizontal: 16, marginBottom: 12, marginTop: 20 },
  
  archiveList: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e7eb' },
  archiveItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6', gap: 12 },
  thumbBox: { width: 80, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  playIcon: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 12, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 9.5, color: '#9CA3AF', marginTop: 2 },
});
