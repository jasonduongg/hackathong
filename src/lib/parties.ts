import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Party {
    id: string;
    name: string;
    createdBy: string;
    members: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Invitation {
    id: string;
    partyId: string;
    partyName: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
}

// Create a new party
export const createParty = async (partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const partyRef = collection(db, 'parties');
    const newParty = {
        ...partyData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const docRef = await addDoc(partyRef, newParty);
    return docRef.id;
};

// Get party by ID
export const getParty = async (partyId: string): Promise<Party | null> => {
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);

    if (partySnap.exists()) {
        return { id: partySnap.id, ...partySnap.data() } as Party;
    } else {
        return null;
    }
};

// Get parties by member ID
export const getPartiesByMember = async (userId: string): Promise<Party[]> => {
    const partiesRef = collection(db, 'parties');
    const q = query(partiesRef, where('members', 'array-contains', userId));
    const querySnapshot = await getDocs(q);

    const parties: Party[] = [];
    querySnapshot.forEach((doc) => {
        parties.push({ id: doc.id, ...doc.data() } as Party);
    });

    return parties;
};

// Update party
export const updateParty = async (partyId: string, updates: Partial<Party>): Promise<void> => {
    const partyRef = doc(db, 'parties', partyId);

    const updateData = {
        ...updates,
        updatedAt: new Date(),
    };

    await updateDoc(partyRef, updateData);
};

// Delete party
export const deleteParty = async (partyId: string): Promise<void> => {
    const partyRef = doc(db, 'parties', partyId);
    await deleteDoc(partyRef);
};

// Add member to party
export const addMemberToParty = async (partyId: string, userId: string): Promise<void> => {
    const partyRef = doc(db, 'parties', partyId);
    await updateDoc(partyRef, {
        members: arrayUnion(userId),
        updatedAt: new Date(),
    });
};

// Remove member from party
export const removeMemberFromParty = async (partyId: string, userId: string): Promise<void> => {
    const partyRef = doc(db, 'parties', partyId);
    await updateDoc(partyRef, {
        members: arrayRemove(userId),
        updatedAt: new Date(),
    });
};

// Create invitation
export const createInvitation = async (invitationData: Omit<Invitation, 'id' | 'createdAt'>): Promise<string> => {
    const invitationRef = collection(db, 'invitations');
    const newInvitation = {
        ...invitationData,
        createdAt: new Date(),
    };

    const docRef = await addDoc(invitationRef, newInvitation);
    return docRef.id;
};

// Get invitation by ID
export const getInvitation = async (invitationId: string): Promise<Invitation | null> => {
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);

    if (invitationSnap.exists()) {
        return { id: invitationSnap.id, ...invitationSnap.data() } as Invitation;
    } else {
        return null;
    }
};

// Get invitations by user ID
export const getInvitationsByUser = async (userId: string, status?: 'pending' | 'accepted' | 'declined'): Promise<Invitation[]> => {
    const invitationsRef = collection(db, 'invitations');
    let q = query(invitationsRef, where('toUserId', '==', userId));

    if (status) {
        q = query(q, where('status', '==', status));
    }

    const querySnapshot = await getDocs(q);

    const invitations: Invitation[] = [];
    querySnapshot.forEach((doc) => {
        invitations.push({ id: doc.id, ...doc.data() } as Invitation);
    });

    return invitations;
};

// Update invitation status
export const updateInvitationStatus = async (invitationId: string, status: 'pending' | 'accepted' | 'declined'): Promise<void> => {
    const invitationRef = doc(db, 'invitations', invitationId);
    await updateDoc(invitationRef, { status });
};

// Delete invitation
export const deleteInvitation = async (invitationId: string): Promise<void> => {
    const invitationRef = doc(db, 'invitations', invitationId);
    await deleteDoc(invitationRef);
};

// Search users by email
export const searchUsersByEmail = async (email: string): Promise<any[]> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '>=', email), where('email', '<=', email + '\uf8ff'));
    const querySnapshot = await getDocs(q);

    const users: any[] = [];
    querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() });
    });

    return users;
}; 