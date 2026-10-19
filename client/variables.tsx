import { TextInput } from "@getpaseo/plugin/client/react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { fillTemplate, parseVariables } from "../shared/templates";
import { Button, Field, inputStyle, type Colors } from "./ui";

type Props = {
  content: string;
  colors: Colors;
  /** "Send" or "Copy"; the button also reads "<action> filled prompt" to screen readers. */
  action: "Send" | "Copy";
  busy?: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  cancelLabel?: string;
  /** Phones skip this so the keyboard does not cover the sheet as it opens. */
  autoFocus?: boolean;
};

/** Fields for each template variable, prefilled with its default. Submits the filled prompt text. */
export function VariableForm({ content, colors, action, busy, onSubmit, onCancel, cancelLabel = "Cancel", autoFocus = true }: Props) {
  const variables = parseVariables(content);
  const [values, setValues] = useState(() => Object.fromEntries(variables.map((variable) => [variable.name, variable.fallback ?? ""])));
  // Only a variable without a default must have a value; clearing a default leaves it empty.
  const missing = variables.some((variable) => variable.fallback === undefined && !values[variable.name]?.trim());
  const submit = () => !missing && !busy && onSubmit(fillTemplate(content, values));
  const input = inputStyle(colors);
  return (
    <View style={{ gap: 12, minWidth: 0 }}>
      {variables.map((variable, index) => (
        <Field key={variable.name} label={variable.name} hint={variable.fallback ? `Default: ${variable.fallback}` : undefined} colors={colors}>
          <TextInput
            accessibilityLabel={`Value for ${variable.name}`}
            value={values[variable.name]}
            onChangeText={(value) => setValues((current) => ({ ...current, [variable.name]: value }))}
            autoFocus={autoFocus && index === 0}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={index === variables.length - 1 ? submit : undefined}
            style={{ ...input, backgroundColor: colors.surface0, paddingVertical: 8, fontSize: 13 }}
          />
        </Field>
      ))}
      {missing && <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>Fill in every field without a default.</Text>}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
        <Button title={cancelLabel} onPress={onCancel} colors={colors} disabled={busy} />
        <Button title={action} icon={action === "Send" ? "Send" : "Copy"} variant="primary" onPress={submit} colors={colors} disabled={busy || missing} accessibilityLabel={`${action} filled prompt`} />
      </View>
    </View>
  );
}
