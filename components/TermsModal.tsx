import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  userType: 'client' | 'merchant' | 'driver';
}

export function TermsModal({ visible, onClose, userType }: TermsModalProps) {
  const getTitle = () => {
    switch (userType) {
      case 'merchant':
        return 'CGU Commerçant';
      case 'driver':
        return 'CGU Livreur';
      default:
        return 'CGU Client';
    }
  };

  const getContent = () => {
    switch (userType) {
      case 'merchant':
        return `
CONDITIONS GÉNÉRALES D'UTILISATION - COMMERÇANTS

1. OBJET
Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme ORDERS App par les commerçants.

2. INSCRIPTION ET VÉRIFICATION
- Tous les commerçants doivent fournir des informations exactes et à jour
- Votre compte sera soumis à vérification avant d'être activé
- La vérification peut prendre jusqu'à 48 heures ouvrables
- ORDERS App se réserve le droit de refuser toute inscription

3. OBLIGATIONS DU COMMERÇANT
- Maintenir un catalogue de produits à jour avec des prix corrects
- Répondre aux commandes dans les délais impartis
- Assurer la qualité et la conformité des produits
- Respecter les normes d'hygiène et de sécurité applicables

4. GESTION DES COMMANDES
- Les commandes doivent être traitées dans un délai de 30 minutes
- Le commerçant doit informer le client de toute indisponibilité de produit
- Le commerçant peut annuler une commande pour motif légitime

5. TARIFICATION ET PAIEMENTS
- Les prix affichés doivent être TTC (Toutes Taxes Comprises)
- ORDERS App prélève une commission de 10% sur chaque transaction
- Les paiements sont effectués selon le calendrier convenu

6. RESPONSABILITÉS
- Le commerçant est responsable de la qualité des produits vendus
- ORDERS App n'est qu'un intermédiaire et ne peut être tenu responsable des litiges entre commerçants et clients

7. DONNÉES PERSONNELLES
- ORDERS App s'engage à protéger vos données personnelles
- Vos données ne seront pas vendues à des tiers

8. RÉSILIATION
- Le commerçant peut fermer son compte à tout moment
- ORDERS App peut suspendre ou fermer un compte en cas de non-respect des CGU

En acceptant ces CGU, vous reconnaissez avoir lu et compris l'ensemble de ces conditions.
        `;
      case 'driver':
        return `
CONDITIONS GÉNÉRALES D'UTILISATION - LIVREURS

1. OBJET
Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme ORDERS App par les livreurs.

2. INSCRIPTION ET VÉRIFICATION
- Tous les livreurs doivent fournir des informations exactes et à jour
- Votre compte sera soumis à vérification avant d'être activé
- La vérification inclut la validation de votre véhicule et de vos documents
- La vérification peut prendre jusqu'à 48 heures ouvrables

3. DOCUMENTS REQUIS
- Pièce d'identité valide
- Permis de conduire (si applicable)
- Assurance du véhicule
- Certificat de visite technique (si applicable)

4. OBLIGATIONS DU LIVREUR
- Respecter les horaires de disponibilité indiqués
- Assurer la sécurité des colis pendant le transport
- Être courtois avec les clients et commerçants
- Respecter le code de la route

5. SYSTÈME DE RÉMUNÉRATION
- La rémunération est basée sur le nombre de livraisons effectuées
- Les bonus express sont applicables selon les conditions définies
- Les paiements sont effectués hebdomadairement

6. DISPONIBILITÉ
- Le livreur définit ses propres horaires de travail
- Le statut de disponibilité doit être maintenu à jour dans l'application
- Un livreur indisponible ne recevra pas de nouvelles commandes

7. RESPONSABILITÉS
- Le livreur est responsable des colis confiés
- Toute perte ou dommage doit être signalé immédiatement
- Le livreur doit avoir une assurance responsabilité civile

8. COMPORTEMENT
- Tout comportement inapproprié peut entraîner la suspension du compte
- Les livreurs doivent maintenir un niveau de service professionnel

9. DONNÉES PERSONNELLES
- ORDERS App s'engage à protéger vos données personnelles
- Vos données ne seront pas vendues à des tiers

10. RÉSILIATION
- Le livreur peut fermer son compte à tout moment
- ORDERS App peut suspendre ou fermer un compte en cas de non-respect des CGU

En acceptant ces CGU, vous reconnaissez avoir lu et compris l'ensemble de ces conditions.
        `;
      default:
        return `
CONDITIONS GÉNÉRALES D'UTILISATION - CLIENTS

1. OBJET
Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme ORDERS App par les clients.

2. INSCRIPTION
- L'inscription sur ORDERS App est gratuite
- Vous devez fournir des informations exactes et à jour
- Vous êtes responsable de la confidentialité de votre compte

3. UTILISATION DE LA PLATEFORME
- ORDERS App met en relation les clients avec les commerçants locaux
- Les commandes sont livrées par des livreurs indépendants
- Les prix affichés sont ceux fixés par les commerçants

4. COMMANDES
- Toute commande passée est considérée comme ferme et définitive
- Vous recevrez une confirmation de commande par l'application
- Les délais de livraison sont indicatifs et peuvent varier

5. PAIEMENT
- Le paiement s'effectue à la livraison (contre remboursement)
- Les modes de paiement acceptés sont : espèces, mobile money
- Vous devez vérifier votre commande à la réception

6. ANNULATION ET RETOUR
- Une commande peut être annulée avant sa préparation
- Les retours sont gérés directement avec le commerçant
- ORDERS App n'est pas responsable des litiges sur la qualité des produits

7. DONNÉES PERSONNELLES
- ORDERS App s'engage à protéger vos données personnelles
- Vos données de localisation sont utilisées uniquement pour les livraisons
- Vous pouvez demander la suppression de vos données à tout moment

8. RESPONSABILITÉS
- ORDERS App est un intermédiaire entre clients, commerçants et livreurs
- Nous ne sommes pas responsables de la qualité des produits vendus
- Nous ne sommes pas responsables des retards de livraison hors de notre contrôle

9. COMPORTEMENT
- Tout comportement inapproprié envers les commerçants ou livreurs peut entraîner la suspension du compte
- Le respect mutuel est essentiel au bon fonctionnement de la plateforme

10. RÉSILIATION
- Vous pouvez fermer votre compte à tout moment depuis les paramètres
- ORDERS App peut suspendre ou fermer un compte en cas de non-respect des CGU

En acceptant ces CGU, vous reconnaissez avoir lu et compris l'ensemble de ces conditions.
        `;
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalText}>{getContent()}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
