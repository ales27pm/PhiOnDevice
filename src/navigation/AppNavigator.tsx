import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ReasoningInterface } from "../components/ReasoningInterface";
import { ReasoningHistory } from "../components/ReasoningHistory";
import { ReasoningSettings } from "../components/ReasoningSettings";
import AdvancedAgentInterface from "../components/AdvancedAgentInterface";

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === "Reasoning") {
              iconName = focused ? "flash" : "flash-outline";
            } else if (route.name === "Agent") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
            } else if (route.name === "History") {
              iconName = focused ? "document-text" : "document-text-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            } else {
              iconName = "help-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#3B82F6",
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: {
            backgroundColor: "white",
            borderTopColor: "#E5E7EB",
            borderTopWidth: 1,
            paddingTop: 5,
            paddingBottom: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Reasoning" component={ReasoningInterface} options={{ title: "Phi-4 AI" }} />
        <Tab.Screen name="Agent" component={AdvancedAgentInterface} options={{ title: "Agent" }} />
        <Tab.Screen name="History" component={ReasoningHistory} options={{ title: "History" }} />
        <Tab.Screen name="Settings" component={ReasoningSettings} options={{ title: "Settings" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
