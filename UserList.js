import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function UserList({
  selectedUser,
  onEdit,
  onSaveComplete,
  refreshTrigger,
  scrollToEnd,
  onScrollFinished,
}) {
  const db = useSQLiteContext();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef(null);

  const loadUsers = useCallback(async () => {
    if (!db) {
      console.log("Banco de dados não disponível");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await db.getAllAsync(
        `SELECT * FROM users WHERE 
         firstName LIKE ? OR 
         lastName LIKE ? OR 
         email LIKE ? OR 
         phone LIKE ? 
         ORDER BY id DESC`,
        [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
      );
      setUsers(result);
      console.log("Usuários carregados:", result.length);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      if (!error.message.includes("closed resource")) {
        Alert.alert("Erro", "Não foi possível carregar os usuários.");
      }
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [db, search]);

  const deleteUser = async (id, userName) => {
    Alert.alert(
      "Confirmação", 
      `Deseja excluir o contato "${userName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!db) {
              Alert.alert("Erro", "Banco de dados não disponível.");
              return;
            }
            
            try {
              await db.runAsync(`DELETE FROM users WHERE id = ?`, [id]);
              console.log("Usuário excluído:", userName);
              loadUsers();
              Alert.alert("Sucesso", "Contato excluído com sucesso!");
            } catch (error) {
              console.error("Erro ao excluir usuário:", error);
              if (!error.message.includes("closed resource")) {
                Alert.alert("Erro", "Não foi possível excluir o contato.");
              }
            }
          },
        },
      ]
    );
  };

  // Debounce para busca
  useEffect(() => {
    if (!db) return;
    
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [loadUsers, db]);

  // Refresh quando necessário
  useEffect(() => {
    if (!db) return;
    
    console.log("Refresh trigger ativado");
    loadUsers();
  }, [refreshTrigger, db]);

  // Scroll para o topo quando necessário
  useEffect(() => {
    if (scrollToEnd && users.length > 0) {
      setTimeout(() => {
        try {
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        } catch (error) {
          console.log("Erro no scroll:", error);
        } finally {
          if (onScrollFinished) onScrollFinished();
        }
      }, 500);
    } else if (scrollToEnd) {
      if (onScrollFinished) onScrollFinished();
    }
  }, [scrollToEnd, users.length, onScrollFinished]);

  const renderUserItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.userInfo}>
        <Text style={styles.name}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            console.log("Botão Editar pressionado para:", item.firstName, item.lastName);
            onEdit(item);
          }}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteUser(item.id, `${item.firstName} ${item.lastName}`)}
        >
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {search ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
      </Text>
      {search && (
        <Text style={styles.emptySubtext}>
          Tente buscar por outro termo
        </Text>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TextInput
        style={styles.search}
        placeholder="🔍 Buscar contatos..."
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.titleContainer}>
        <Text style={styles.sectionTitle}>
          {users.length} {users.length === 1 ? "Contato" : "Contatos"}
        </Text>
        {isLoading && (
          <ActivityIndicator size="small" color="#666" style={styles.loader} />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={listRef}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.contentContainer}
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  search: {
    height: 44,
    borderColor: "#ddd",
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  loader: {
    marginLeft: 8,
  },
  item: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    marginBottom: 12,
  },
  name: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#333",
    marginBottom: 4,
  },
  email: {
    color: "#666",
    fontSize: 14,
    marginBottom: 2,
  },
  phone: {
    color: "#666",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#f44336",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});