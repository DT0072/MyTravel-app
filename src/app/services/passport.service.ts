import { Injectable, inject } from '@angular/core';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppLanguage } from './accessibility-preferences.service';
import { AppStateService } from './app-state.service';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

export interface ProfileStamp {
  id: string;
  name: string;
  active: boolean;
  image: string;
  heroImage: string;
  region: 'state' | 'federal';
  label: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
  unlockedAt?: string;
  pointsAwarded?: number;
}

const DEFAULT_STAMPS: ProfileStamp[] = [
  {
    id: 'perlis',
    name: 'Perlis',
    active: true,
    image: 'assets/mytravel/stamp-perlis.png',
    heroImage: 'assets/mytravel/timah-tasoh-hero.png',
    region: 'state',
    label: { EN: 'Timah Tasoh & Northern Heritage', BM: 'Timah Tasoh & Warisan Utara' },
    description: {
      EN: 'Northern border heritage, tranquil lake views, and limestone hills.',
      BM: 'Warisan sempadan utara, pemandangan tasik yang tenang, dan bukit batu kapur.',
    },
    unlockedAt: '2026-06-12',
    pointsAwarded: 50,
  },
  {
    id: 'penang',
    name: 'Penang',
    active: true,
    image: 'assets/mytravel/stamp-penang.png',
    heroImage: 'assets/mytravel/george-town.png',
    region: 'state',
    label: { EN: 'UNESCO Heritage & Culinary Capital', BM: 'Warisan UNESCO & Ibu Kota Kulinari' },
    description: {
      EN: 'Historic shophouses, street art, trishaw trails, and seaside promenades.',
      BM: 'Rumah kedai bersejarah, seni jalanan, laluan beca, dan persiaran tepi pantai.',
    },
    unlockedAt: '2026-06-18',
    pointsAwarded: 50,
  },
  {
    id: 'melaka',
    name: 'Melaka',
    active: true,
    image: 'assets/mytravel/stamp-melaka.png',
    heroImage: 'assets/mytravel/melaka.png',
    region: 'state',
    label: { EN: 'Historic Port City & Red Square', BM: 'Bandar Pelabuhan Bersejarah & Dataran Merah' },
    description: {
      EN: 'Ancient fortress walls, river cruise journeys, and vibrant Baba Nyonya legacy.',
      BM: 'Kubu bersejarah, pelayaran sungai Melaka, dan warisan Baba Nyonya.',
    },
    unlockedAt: '2026-06-25',
    pointsAwarded: 50,
  },
  {
    id: 'selangor',
    name: 'Selangor',
    active: true,
    image: 'assets/mytravel/stamp-selangor.png',
    heroImage: 'assets/mytravel/transit-map.png',
    region: 'state',
    label: { EN: 'Royal Heritage & Modern Transit', BM: 'Warisan Diraja & Rangkaian Transit Moden' },
    description: {
      EN: 'Batu Caves shrines, mangrove sanctuaries, and modern multimodal transit links.',
      BM: 'Kuil Batu Caves, santuari paya bakau, dan rangkaian transit bersepadu.',
    },
    unlockedAt: '2026-07-02',
    pointsAwarded: 50,
  },
  {
    id: 'kuala-lumpur',
    name: 'Kuala Lumpur',
    active: true,
    image: 'assets/Thean-ho-temple.png',
    heroImage: 'assets/Thean-ho-temple.png',
    region: 'federal',
    label: { EN: 'Thean Hou & Capital Skylines', BM: 'Thean Hou & Mercu Tanda Ibu Negara' },
    description: {
      EN: 'Iconic architectural marvels, heritage temples, and interconnected rail networks.',
      BM: 'Mercu tanda ikonik, kuil warisan, dan jaringan transit rel bersepadu.',
    },
    unlockedAt: '2026-07-04',
    pointsAwarded: 50,
  },
  {
    id: 'perak',
    name: 'Perak',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/raban-lake.png',
    region: 'state',
    label: { EN: 'Royal Belum & Raban Lake', BM: 'Royal Belum & Tasik Raban' },
    description: {
      EN: 'Ancient rainforests, royal traditions, tin-mining history, and freshwater lakes.',
      BM: 'Hutan hujan tertua, tradisi diraja, sejarah perlombongan bijih, dan tasik air tawar.',
    },
  },
  {
    id: 'kedah',
    name: 'Kedah',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/timah-tasoh-hero.png',
    region: 'state',
    label: { EN: 'Rice Bowl & Langkawi Geopark', BM: 'Jelapang Padi & Geopark Langkawi' },
    description: {
      EN: 'Golden paddy expanses, Mount Jerai vistas, and ancient archipelago geology.',
      BM: 'Hamparan sawah padi keemasan, Gunung Jerai, dan keindahan pulau lagenda.',
    },
  },
  {
    id: 'johor',
    name: 'Johor',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/transit-map.png',
    region: 'state',
    label: { EN: 'Southern Gateway & Endau-Rompin', BM: 'Pintu Gerbang Selatan & Endau-Rompin' },
    description: {
      EN: 'Pristine rainforest valleys, royal botanical gardens, and southern maritime bridges.',
      BM: 'Lembah hutan dara, taman botani diraja, dan jambatan maritim selatan.',
    },
  },
  {
    id: 'pahang',
    name: 'Pahang',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/timah-tasoh-hero.png',
    region: 'state',
    label: { EN: 'Taman Negara & Highland Retreats', BM: 'Taman Negara & Tanah Tinggi' },
    description: {
      EN: 'Century-old canopy walkways, tea plantations, and cool highland sanctuaries.',
      BM: 'Titian kanopi tertua di dunia, ladang teh, dan santuari tanah tinggi.',
    },
  },
  {
    id: 'terengganu',
    name: 'Terengganu',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/george-town.png',
    region: 'state',
    label: { EN: 'Crystal Mosque & Coastal Isles', BM: 'Masjid Kristal & Kepulauan Pesisir' },
    description: {
      EN: 'Intricate boat-building crafts, emerald waters, and marine sanctuaries.',
      BM: 'Seni pertukangan bot tradisi, air laut zamrud, dan santuari penyu.',
    },
  },
  {
    id: 'kelantan',
    name: 'Kelantan',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/melaka.png',
    region: 'state',
    label: { EN: 'Cradle of Malay Culture', BM: 'Pusat Kebudayaan Melayu' },
    description: {
      EN: 'Wau kite festivals, vibrant bazaar markets, and traditional silat arts.',
      BM: 'Pesta wau bulan, Pasar Siti Khadijah, dan seni persilatan warisan.',
    },
  },
  {
    id: 'negeri-sembilan',
    name: 'Negeri Sembilan',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/mytravel/raban-lake.png',
    region: 'state',
    label: { EN: 'Adat Perpatih & Minangkabau Architecture', BM: 'Adat Perpatih & Seni Bina Minangkabau' },
    description: {
      EN: 'Unique curved horn-roof palaces and living matrilineal cultural heritage.',
      BM: 'Istana kayu beratap tanduk lentik dan warisan budaya matrilineal yang unik.',
    },
  },
  {
    id: 'sabah',
    name: 'Sabah',
    active: false,
    image: 'assets/Mount_kinabalu.png',
    heroImage: 'assets/Mount_kinabalu.png',
    region: 'state',
    label: { EN: 'Mount Kinabalu & Coral Reefs', BM: 'Gunung Kinabalu & Terumbu Karang' },
    description: {
      EN: 'Sacred mountain peaks, orangutan sanctuaries, and world-class diving at Sipadan.',
      BM: 'Puncak megah Kinabalu, santuari orangutan, dan keajaiban terumbu karang.',
    },
  },
  {
    id: 'sarawak',
    name: 'Sarawak',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/Mount_kinabalu.png',
    region: 'state',
    label: { EN: 'Gunung Mulu Caves & Rainforests', BM: 'Gua Gunung Mulu & Hutan Kenyalang' },
    description: {
      EN: 'The world\'s largest cave chambers, longhouse hospitality, and endemic wildlife.',
      BM: 'Dewan gua terbesar di dunia, keramahan rumah panjang, dan hidupan liar unik.',
    },
  },
  {
    id: 'putrajaya',
    name: 'Putrajaya',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/Thean-ho-temple.png',
    region: 'federal',
    label: { EN: 'Intelligent Garden City', BM: 'Bandar Raya Pintar dalam Taman' },
    description: {
      EN: 'Magnificent pink dome mosques, iconic suspension bridges, and tranquil wetland lakes.',
      BM: 'Masjid Putra berkubah merah jambu, jambatan gantung ikonik, dan tasik tanah basah.',
    },
  },
  {
    id: 'labuan',
    name: 'Labuan',
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
    heroImage: 'assets/Mount_kinabalu.png',
    region: 'federal',
    label: { EN: 'Pearl of the South China Sea', BM: 'Mutiara Laut China Selatan' },
    description: {
      EN: 'Maritime trade history, historical chimney towers, and shipwreck dive sites.',
      BM: 'Sejarah maritim, menara cerobong bersejarah, dan tapak selaman bangkai kapal.',
    },
  },
];

export function createLockedStamps(): ProfileStamp[] {
  return DEFAULT_STAMPS.map((stamp) => ({
    ...stamp,
    active: false,
    image: 'assets/mytravel/stamp-locked.png',
  }));
}

@Injectable({
  providedIn: 'root',
})
export class PassportService {
  private readonly fb = inject(FirebaseService);
  private readonly auth = inject(AuthService);
  private readonly appState = inject(AppStateService);

  private readonly stampsSubject = new BehaviorSubject<ProfileStamp[]>(
    this.auth.isAuthenticated ? DEFAULT_STAMPS : createLockedStamps()
  );
  readonly stamps$: Observable<ProfileStamp[]> = this.stampsSubject.asObservable();

  constructor() {
    this.auth.currentUser$.subscribe((user) => {
      if (user && !user.isGuest) {
        void this.syncFromFirestore(user.uid);
      } else {
        this.stampsSubject.next(createLockedStamps());
      }
    });
  }

  get stamps(): ProfileStamp[] {
    return this.stampsSubject.value;
  }

  getStamps(): ProfileStamp[] {
    return this.stampsSubject.value;
  }

  get totalCount(): number {
    return this.stamps.length;
  }

  get collectedCount(): number {
    return this.stamps.filter((s) => s.active).length;
  }

  async unlockStamp(stampId: string): Promise<boolean> {
    if (!this.auth.isAuthenticated) {
      return false;
    }

    const current = [...this.stamps];
    const index = current.findIndex((s) => s.id === stampId);
    if (index === -1) return false;

    if (current[index].active) {
      return true; // already unlocked
    }

    const updatedStamp: ProfileStamp = {
      ...current[index],
      active: true,
      image: current[index].image === 'assets/mytravel/stamp-locked.png'
        ? (current[index].heroImage || 'assets/mytravel/stamp-perlis.png')
        : current[index].image,
      unlockedAt: new Date().toISOString().split('T')[0],
      pointsAwarded: 50,
    };

    current[index] = updatedStamp;
    this.stampsSubject.next(current);

    // Award +50 Eco-Points
    this.appState.awardEcoPoints(50, {
      title: 'Digital Passport stamp',
      subtitle: `${updatedStamp.name} stamp unlocked`,
    });

    const user = this.auth.currentUser;
    if (user && !user.isGuest) {
      try {
        await setDoc(doc(this.fb.db, 'users', user.uid, 'stamps', stampId), {
          stampId,
          name: updatedStamp.name,
          unlocked: true,
          unlockedAt: updatedStamp.unlockedAt,
          pointsAwarded: 50,
        });
      } catch (err) {
        console.warn('Could not persist stamp to Firestore:', err);
      }
    }

    return true;
  }

  private async syncFromFirestore(uid: string): Promise<void> {
    try {
      const snap = await getDocs(collection(this.fb.db, 'users', uid, 'stamps'));
      if (snap.empty) {
        // First-time sync: push default unlocked stamps
        for (const stamp of DEFAULT_STAMPS.filter((s) => s.active)) {
          await setDoc(doc(this.fb.db, 'users', uid, 'stamps', stamp.id), {
            stampId: stamp.id,
            name: stamp.name,
            unlocked: true,
            unlockedAt: stamp.unlockedAt,
            pointsAwarded: 50,
          });
        }
        return;
      }

      const unlockedIds = new Set<string>();
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data['unlocked']) {
          unlockedIds.add(data['stampId'] || docSnap.id);
        }
      });

      const updated = DEFAULT_STAMPS.map((stamp) => ({
        ...stamp,
        active: unlockedIds.has(stamp.id) || stamp.active,
      }));

      this.stampsSubject.next(updated);
    } catch (err) {
      console.warn('Could not sync stamps from Firestore:', err);
    }
  }
}
