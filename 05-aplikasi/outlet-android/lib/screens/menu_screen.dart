import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../services/api_client.dart';
import '../theme/app_theme.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  late Future<List<MenuItem>> _future;
  static const _categories = [
    'Makanan',
    'Ayam',
    'Nasi',
    'Burger',
    'Pizza',
    'Kopi',
    'Minuman',
    'Salad',
    'Snack',
    'Lainnya',
  ];

  @override
  void initState() {
    super.initState();
    _future = context.read<ApiClient>().getMenus();
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<ApiClient>().getMenus());
    await _future;
  }

  Future<void> _add() async {
    final name = TextEditingController();
    final price = TextEditingController();
    var category = 'Makanan';
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocal) => AlertDialog(
          title: const Text('Tambah menu'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nama')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(labelText: 'Kategori'),
                items: _categories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setLocal(() => category = v ?? 'Makanan'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Harga'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Simpan')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    final api = context.read<ApiClient>();
    try {
      await api.createMenu(
        name: name.text.trim(),
        price: int.tryParse(price.text.trim()) ?? 0,
        category: category,
      );
      await _reload();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _toggle(MenuItem menu) async {
    final api = context.read<ApiClient>();
    await api.updateMenu(menu.id, {'isAvailable': !menu.isAvailable});
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Menu', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(onPressed: _add, icon: const Icon(Icons.add_rounded)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Tambah menu'),
      ),
      body: FutureBuilder<List<MenuItem>>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final menus = snap.data!;
          if (menus.isEmpty) {
            return const Center(child: Text('Belum ada menu'));
          }
          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: menus.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final m = menus[i];
                return Card(
                  child: ListTile(
                    title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('${m.category} · stok ${m.stock}'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          rupiah(m.price),
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Switch.adaptive(
                          value: m.isAvailable,
                          activeThumbColor: AppColors.success,
                          onChanged: (_) => _toggle(m),
                        ),
                      ],
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
