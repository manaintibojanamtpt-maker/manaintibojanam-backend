package com.bhojanos.customer.presentation.discovery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bhojanos.core.common.NetworkResult
import com.bhojanos.customer.domain.discovery.DiscoveryRepository
import com.bhojanos.customer.domain.discovery.Restaurant
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** UI state for the discovery screen */
sealed class DiscoveryUiState {
    object Loading : DiscoveryUiState()
    data class Success(val restaurants: List<Restaurant>) : DiscoveryUiState()
    object Empty : DiscoveryUiState()
    data class Error(val message: String) : DiscoveryUiState()
}

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<DiscoveryUiState>(DiscoveryUiState.Loading)
    val uiState: StateFlow<DiscoveryUiState> = _uiState.asStateFlow()

    fun loadDiscovery(latitude: Double, longitude: Double) {
        viewModelScope.launch {
            _uiState.update { DiscoveryUiState.Loading }
            val result = discoveryRepository.getDiscovery(latitude, longitude)
            when (result) {
                is NetworkResult.Success -> {
                    val restaurants = result.data
                    if (restaurants.isEmpty()) {
                        _uiState.update { DiscoveryUiState.Empty }
                    } else {
                        _uiState.update { DiscoveryUiState.Success(restaurants) }
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update { DiscoveryUiState.Error(result.message ?: "Unknown error") }
                }
                is NetworkResult.Loading -> { /* ignore */ }
            }
        }
    }
}