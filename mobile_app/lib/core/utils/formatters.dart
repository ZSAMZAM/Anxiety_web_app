class Formatters {
  static String formatDate(String? value) {
    if (value == null || value.isEmpty) return '-';
    return value;
  }

  static String formatStatusBadge(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
}
