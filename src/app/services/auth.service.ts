import { Injectable, inject } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppStateService } from './app-state.service';
import { FirebaseService } from './firebase.service';

export type TravelerType = 'malaysian' | 'foreign';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  initials: string;
  ecoPoints: number;
  isGuest: boolean;
  createdAt: string;
  photoURL?: string | null;
  provider?: string;
  travelerType?: TravelerType;
  idNumber?: string;
  nationality?: string;
  homeState?: string;
  isVerified?: boolean;
}

const GUEST_STORAGE_KEY = 'mytravel_guest_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly fb = inject(FirebaseService);
  private readonly appState = inject(AppStateService);

  private readonly currentUserSubject = new BehaviorSubject<UserProfile | null>(this.loadGuestUser());
  readonly currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  private isAuthInitialized = false;

  constructor() {
    this.initAuthListener();
    this.appState.state$?.subscribe((state) => {
      if (this.isAuthenticated && this.currentUser && state.ecoPoints > this.currentUser.ecoPoints) {
        void this.updateEcoPoints(state.ecoPoints);
      }
    });
  }

  get currentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    const user = this.currentUser;
    return Boolean(user && !user.isGuest);
  }

  private initAuthListener(): void {
    onAuthStateChanged(this.fb.auth, async (firebaseUser: User | null) => {
      this.isAuthInitialized = true;
      if (firebaseUser) {
        this.clearGuestUser();
        const profile = await this.fetchOrCreateProfile(firebaseUser);
        const localPoints = this.appState.getSnapshot().ecoPoints;
        if (localPoints > profile.ecoPoints) {
          profile.ecoPoints = localPoints;
          void this.updateEcoPoints(localPoints);
        } else if (profile.ecoPoints > localPoints) {
          this.appState.syncEcoPoints(profile.ecoPoints);
        }
        this.currentUserSubject.next(profile);
      } else {
        const guest = this.loadGuestUser();
        this.currentUserSubject.next(guest);
      }
    });
  }

  async login(email: string, pass: string): Promise<UserProfile> {
    const cred = await signInWithEmailAndPassword(this.fb.auth, email, pass);
    const profile = await this.fetchOrCreateProfile(cred.user, 'password');
    this.currentUserSubject.next(profile);
    return profile;
  }

  async loginWithGoogle(): Promise<UserProfile> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(this.fb.auth, provider);
    const profile = await this.fetchOrCreateProfile(cred.user, 'google.com');
    this.currentUserSubject.next(profile);
    return profile;
  }

  async register(
    email: string,
    pass: string,
    displayName: string,
    verificationData?: {
      travelerType: TravelerType;
      idNumber: string;
      nationality?: string;
      homeState?: string;
    }
  ): Promise<UserProfile> {
    const cred = await createUserWithEmailAndPassword(this.fb.auth, email, pass);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    const initials = this.computeInitials(displayName || email);
    const travelerType = verificationData?.travelerType || 'malaysian';
    const localPoints = this.appState.getSnapshot().ecoPoints;
    const initialPoints = localPoints > 0 ? localPoints + 50 : 120;
    this.appState.syncEcoPoints(initialPoints);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName.trim() || 'Traveler',
      initials,
      ecoPoints: initialPoints,
      isGuest: false,
      createdAt: new Date().toISOString(),
      provider: 'password',
      travelerType,
      idNumber: verificationData?.idNumber?.trim() || '',
      nationality: travelerType === 'malaysian' ? 'Malaysia' : (verificationData?.nationality?.trim() || 'International'),
      homeState: travelerType === 'malaysian' ? (verificationData?.homeState?.trim() || 'Kuala Lumpur') : undefined,
      isVerified: true,
    };

    try {
      await setDoc(doc(this.fb.db, 'users', cred.user.uid), newProfile);
    } catch (err) {
      console.warn('Could not save profile document to Firestore, continuing with local profile:', err);
    }

    this.currentUserSubject.next(newProfile);
    return newProfile;
  }

  async logout(): Promise<void> {
    this.clearGuestUser();
    await signOut(this.fb.auth);
    this.currentUserSubject.next(null);
  }

  loginAsGuest(name = 'Guest Traveler'): UserProfile {
    const initials = this.computeInitials(name);
    const guestProfile: UserProfile = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: null,
      displayName: name,
      initials,
      ecoPoints: 0,
      isGuest: true,
      createdAt: new Date().toISOString(),
      isVerified: false,
    };
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
    } catch {
      // ignore storage failure
    }
    this.currentUserSubject.next(guestProfile);
    return guestProfile;
  }

  async updateEcoPoints(points: number): Promise<void> {
    const user = this.currentUser;
    if (!user) return;

    user.ecoPoints = points;
    this.currentUserSubject.next({ ...user });

    if (!user.isGuest) {
      try {
        await updateDoc(doc(this.fb.db, 'users', user.uid), { ecoPoints: points });
      } catch (err) {
        console.warn('Could not update points in Firestore:', err);
      }
    } else {
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
    }
  }

  private async fetchOrCreateProfile(user: User, providerId?: string): Promise<UserProfile> {
    const userDocRef = doc(this.fb.db, 'users', user.uid);
    const resolvedProvider = providerId || user.providerData?.[0]?.providerId || 'password';
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        return {
          uid: user.uid,
          email: user.email,
          displayName: data.displayName || user.displayName || 'Traveler',
          initials: this.computeInitials(data.displayName || user.displayName || user.email || 'TR'),
          ecoPoints: typeof data.ecoPoints === 'number' ? data.ecoPoints : 100,
          isGuest: false,
          createdAt: data.createdAt || new Date().toISOString(),
          photoURL: user.photoURL || data.photoURL || null,
          provider: data.provider || resolvedProvider,
          travelerType: data.travelerType || 'malaysian',
          idNumber: data.idNumber || '',
          nationality: data.nationality || (data.travelerType === 'foreign' ? 'International' : 'Malaysia'),
          homeState: data.homeState,
          isVerified: typeof data.isVerified === 'boolean' ? data.isVerified : true,
        };
      }
    } catch (err) {
      console.warn('Could not read user profile from Firestore:', err);
    }

    // Default if document does not exist yet
    const name = user.displayName || (user.email ? user.email.split('@')[0] : 'Traveler');
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || null,
      displayName: name,
      initials: this.computeInitials(name),
      ecoPoints: 100,
      isGuest: false,
      createdAt: new Date().toISOString(),
      photoURL: user.photoURL || null,
      provider: resolvedProvider,
      travelerType: 'malaysian',
      idNumber: '',
      nationality: 'Malaysia',
      isVerified: true,
    };

    try {
      await setDoc(userDocRef, profile);
    } catch (err) {
      console.warn('Could not write user profile to Firestore:', err);
    }

    return profile;
  }

  private computeInitials(nameOrEmail: string): string {
    const clean = nameOrEmail.replace(/@.*$/, '').trim();
    if (!clean) return 'TR';
    const parts = clean.split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  private loadGuestUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as UserProfile;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private clearGuestUser(): void {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
